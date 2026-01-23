/**
 * WhatsApp Calling API - WebRTC Signaling Handler
 * 
 * Manages SDP Offer/Answer exchange with Meta for establishing VoIP sessions.
 * Supports 1,000 concurrent calls (inbound + outbound).
 */

/**
 * Media configuration extracted from SDP
 */
export interface MediaConfig {
    codecs: Array<{
        id: number;
        name: string;
        rate: number;
        channels?: number;
    }>;
    rtpPort: number;
    encryption: {
        suite: string;
        key: string;
    };
}

/**
 * Call setup infrastructure
 */
export interface CallSetup {
    callId: string;
    localIP: string;
    localPort: number;
    mediaConfig: MediaConfig;
    rtpEndpoint: string;
}

/**
 * SDP Offer from Meta
 */
interface SDPOffer {
    version: string;
    origin: string;
    sessionName: string;
    connection: string;
    timing: string;
    audioCodecs: MediaConfig['codecs'];
    audioPort: number;
    crypto: MediaConfig['encryption'];
}

/**
 * WebRTC Signaling Handler for WhatsApp Calls
 */
export class CallingSignalingHandler {
    private rtpPortPool: number[] = [];
    private activeCallsCount = 0;
    private readonly MAX_CONCURRENT_CALLS = 1000;

    constructor() {
        this.initializeRTPPortPool();
    }

    /**
     * Initialize RTP port pool for concurrent calls
     */
    private initializeRTPPortPool() {
        // Reserve ports 50000-51999 for RTP (2000 ports for 1000 concurrent calls)
        for (let port = 50000; port < 52000; port += 2) {
            this.rtpPortPool.push(port);
        }
        console.log('[Calling] RTP port pool initialized:', this.rtpPortPool.length);
    }

    /**
     * Process incoming SDP Offer from Meta
     */
    async processOffer(params: {
        callId: string;
        fromPhoneNumber: string;
        sdpOffer: string;
    }): Promise<{
        sdpAnswer: string;
        callSetup: CallSetup;
    }> {
        console.log('[Calling] Processing SDP Offer for call:', params.callId);

        // Check concurrent call limit
        if (this.activeCallsCount >= this.MAX_CONCURRENT_CALLS) {
            throw new Error('Maximum concurrent calls reached (1000)');
        }

        // 1. Parse SDP Offer
        const offer = this.parseSDP(params.sdpOffer);
        console.log('[Calling] Parsed SDP Offer:', {
            codecs: offer.audioCodecs.map(c => c.name),
            port: offer.audioPort
        });

        // 2. Extract media configuration
        const mediaConfig: MediaConfig = {
            codecs: offer.audioCodecs,
            rtpPort: offer.audioPort,
            encryption: offer.crypto
        };

        // 3. Allocate RTP port
        const localPort = await this.allocateRTPPort();
        if (!localPort) {
            throw new Error('No available RTP ports');
        }

        // 4. Get local IP (from environment or infrastructure)
        const localIP = await this.getLocalIP();

        // 5. Generate SDP Answer
        const sdpAnswer = this.generateSDPAnswer({
            callId: params.callId,
            mediaConfig,
            localIP,
            localPort
        });

        // 6. Setup call infrastructure
        const callSetup: CallSetup = {
            callId: params.callId,
            localIP,
            localPort,
            mediaConfig,
            rtpEndpoint: `${localIP}:${localPort}`
        };

        // 7. Track active call
        this.activeCallsCount++;
        console.log('[Calling] Active calls:', this.activeCallsCount);

        return { sdpAnswer, callSetup };
    }

    /**
     * Parse SDP Offer from Meta
     */
    private parseSDP(sdp: string): SDPOffer {
        const lines = sdp.split('\r\n');

        const offer: SDPOffer = {
            version: '',
            origin: '',
            sessionName: '',
            connection: '',
            timing: '',
            audioCodecs: [],
            audioPort: 0,
            crypto: { suite: '', key: '' }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('v=')) {
                offer.version = line.substring(2);
            } else if (line.startsWith('o=')) {
                offer.origin = line.substring(2);
            } else if (line.startsWith('s=')) {
                offer.sessionName = line.substring(2);
            } else if (line.startsWith('c=')) {
                offer.connection = line.substring(2);
            } else if (line.startsWith('t=')) {
                offer.timing = line.substring(2);
            } else if (line.startsWith('m=audio')) {
                // Extract port and codec IDs
                const parts = line.split(' ');
                offer.audioPort = parseInt(parts[1]);
                const codecIds = parts.slice(3).map(id => parseInt(id));

                // Parse rtpmap attributes for codecs
                for (let j = i + 1; j < lines.length; j++) {
                    const attrLine = lines[j];
                    if (attrLine.startsWith('a=rtpmap:')) {
                        const rtpmap = attrLine.substring(9);
                        const [idStr, codecInfo] = rtpmap.split(' ');
                        const id = parseInt(idStr);

                        if (codecIds.includes(id)) {
                            const [name, rateInfo] = codecInfo.split('/');
                            const [rate, channels] = rateInfo.split('/').map(s => parseInt(s));

                            offer.audioCodecs.push({
                                id,
                                name,
                                rate,
                                channels: channels || 1
                            });
                        }
                    } else if (attrLine.startsWith('a=crypto:')) {
                        // Parse crypto attribute
                        const crypto = attrLine.substring(9);
                        const parts = crypto.split(' ');
                        offer.crypto = {
                            suite: parts[1],
                            key: parts[2].split(':')[1]
                        };
                    } else if (attrLine.startsWith('m=')) {
                        // Next media section, stop parsing audio
                        break;
                    }
                }
            }
        }

        return offer;
    }

    /**
     * Generate SDP Answer compatible with Meta
     */
    private generateSDPAnswer(params: {
        callId: string;
        mediaConfig: MediaConfig;
        localIP: string;
        localPort: number;
    }): string {
        const { callId, mediaConfig, localIP, localPort } = params;

        // Select best codec (prefer Opus)
        const preferredCodecs = ['opus', 'ISAC', 'PCMU'];
        const sortedCodecs = mediaConfig.codecs.sort((a, b) => {
            const aIndex = preferredCodecs.indexOf(a.name.toLowerCase());
            const bIndex = preferredCodecs.indexOf(b.name.toLowerCase());
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });

        // Build SDP Answer
        const sdpLines = [
            'v=0',
            `o=- ${callId} 1 IN IP4 ${localIP}`,
            's=Pixy VoIP',
            `c=IN IP4 ${localIP}`,
            't=0 0',
            `m=audio ${localPort} RTP/SAVP ${sortedCodecs.map(c => c.id).join(' ')}`
        ];

        // Add rtpmap for each codec
        sortedCodecs.forEach(codec => {
            const channels = codec.channels && codec.channels > 1 ? `/${codec.channels}` : '';
            sdpLines.push(`a=rtpmap:${codec.id} ${codec.name}/${codec.rate}${channels}`);
        });

        // Add crypto (use same as offer)
        sdpLines.push(`a=crypto:1 ${mediaConfig.encryption.suite} inline:${mediaConfig.encryption.key}`);

        // Add media attributes
        sdpLines.push('a=sendrecv');

        const sdp = sdpLines.join('\r\n') + '\r\n';

        console.log('[Calling] Generated SDP Answer:', sdp.substring(0, 200) + '...');

        return sdp;
    }

    /**
     * Allocate RTP port from pool
     */
    private async allocateRTPPort(): Promise<number | null> {
        if (this.rtpPortPool.length === 0) {
            return null;
        }
        return this.rtpPortPool.shift() || null;
    }

    /**
     * Release RTP port back to pool
     */
    releaseRTPPort(port: number): void {
        this.rtpPortPool.push(port);
        this.activeCallsCount = Math.max(0, this.activeCallsCount - 1);
        console.log('[Calling] Released port, active calls:', this.activeCallsCount);
    }

    /**
     * Get local IP for RTP endpoint
     */
    private async getLocalIP(): Promise<string> {
        // In production, this should return the public IP of VoIP server
        // For development, use environment variable
        return process.env.VOIP_SERVER_IP || '0.0.0.0';
    }

    /**
     * Get current active calls count
     */
    getActiveCallsCount(): number {
        return this.activeCallsCount;
    }

    /**
     * Get available capacity
     */
    getAvailableCapacity(): {
        current: number;
        max: number;
        available: number;
        utilizationPercent: number;
    } {
        return {
            current: this.activeCallsCount,
            max: this.MAX_CONCURRENT_CALLS,
            available: this.MAX_CONCURRENT_CALLS - this.activeCallsCount,
            utilizationPercent: (this.activeCallsCount / this.MAX_CONCURRENT_CALLS) * 100
        };
    }
}

// Singleton instance
export const callingSignalingHandler = new CallingSignalingHandler();
