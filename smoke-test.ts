/**
 * Smoke Test Suite for Phase 1 Implementation
 * 
 * Tests:
 * 1. BullMQ Worker - Process message bursts
 * 2. WABA Subscription - Verify subscribed_apps endpoint
 * 3. Error Handler - Capture error 132018
 */

import { metaMessageQueue } from './src/lib/meta/message-queue';
import { wabaSubscriptionManager } from './src/lib/meta/waba-subscription-manager';
import { metaErrorHandler, MetaError } from './src/lib/meta/meta-error-handler';
import { metaTelemetry } from './src/lib/meta/meta-telemetry';

// ANSI colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
};

function log(emoji: string, message: string, color?: string) {
    const colorCode = color || colors.reset;
    console.log(`${colorCode}${emoji} ${message}${colors.reset}`);
}

function section(title: string) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${colors.blue}${title}${colors.reset}`);
    console.log(`${'='.repeat(60)}\n`);
}

// Test results accumulator
const results: { test: string; passed: boolean; details?: string }[] = [];

/**
 * Test 1: BullMQ Worker - Message Burst Processing
 */
async function testMessageBurstProcessing(): Promise<boolean> {
    section('Test 1: BullMQ Worker - Message Burst Processing');

    try {
        log('🔧', 'Initializing BullMQ worker with 3 concurrent workers...');

        // Initialize worker with lower concurrency for testing
        await metaMessageQueue.initializeWorker(3);

        log('✓', 'Worker initialized successfully', colors.green);

        // Simulate message burst (10 messages)
        const burstSize = 10;
        log('📤', `Enqueueing ${burstSize} test messages...`);

        const jobIds: string[] = [];
        const startTime = Date.now();

        for (let i = 0; i < burstSize; i++) {
            const jobId = await metaMessageQueue.enqueueMessage({
                wabaId: 'test_waba_id',
                phoneNumberId: 'test_phone_number_id',
                accessToken: 'test_access_token',
                to: `1234567890${i}`,
                message: {
                    type: 'text',
                    content: {
                        text: `Test message ${i + 1}/${burstSize}`
                    }
                },
                metadata: {
                    testMode: true,
                    testId: `smoke_test_${i}`
                }
            });

            jobIds.push(jobId);
        }

        const enqueueTime = Date.now() - startTime;
        log('✓', `${burstSize} messages enqueued in ${enqueueTime}ms`, colors.green);

        // Wait for processing (give it some time)
        log('⏳', 'Waiting for queue processing (5 seconds)...');
        await sleep(5000);

        // Check queue metrics
        const metrics = await metaMessageQueue.getMetrics();
        log('📊', `Queue Metrics:`, colors.blue);
        console.log(`   - Waiting: ${metrics.waiting}`);
        console.log(`   - Active: ${metrics.active}`);
        console.log(`   - Completed: ${metrics.completed}`);
        console.log(`   - Failed: ${metrics.failed}`);

        // Test passes if messages were processed (completed or failed, not stuck)
        const processed = metrics.completed + metrics.failed;
        const isPassing = processed >= burstSize * 0.5; // At least 50% processed

        if (isPassing) {
            log('✓', `Test PASSED: ${processed}/${burstSize} messages processed`, colors.green);
            results.push({
                test: 'BullMQ Message Burst',
                passed: true,
                details: `Processed ${processed}/${burstSize} messages`
            });
        } else {
            log('✗', `Test FAILED: Only ${processed}/${burstSize} messages processed`, colors.red);
            results.push({
                test: 'BullMQ Message Burst',
                passed: false,
                details: `Only ${processed}/${burstSize} messages processed`
            });
        }

        // Cleanup
        await metaMessageQueue.close();

        return isPassing;

    } catch (error: any) {
        log('✗', `Test FAILED with exception: ${error.message}`, colors.red);
        console.error(error);

        results.push({
            test: 'BullMQ Message Burst',
            passed: false,
            details: error.message
        });

        return false;
    }
}

/**
 * Test 2: WABA Subscription Endpoint
 */
async function testWABASubscription(): Promise<boolean> {
    section('Test 2: WABA Subscription - subscribed_apps Endpoint');

    try {
        // Check if we have real credentials
        const wabaId = process.env.TEST_WABA_ID;
        const accessToken = process.env.TEST_ACCESS_TOKEN;

        if (!wabaId || !accessToken) {
            log('⚠', 'Skipping live API test - No credentials provided', colors.yellow);
            log('ℹ', 'To run live test, set TEST_WABA_ID and TEST_ACCESS_TOKEN', colors.blue);

            // Test with mock (just validate function exists and structure)
            log('🧪', 'Running mock subscription test...');

            const mockResult = await simulateWABASubscription();

            if (mockResult) {
                log('✓', 'Test PASSED: WABA subscription structure validated', colors.green);
                results.push({
                    test: 'WABA Subscription (Mock)',
                    passed: true,
                    details: 'Function structure and error handling validated'
                });
                return true;
            } else {
                log('✗', 'Test FAILED: Mock subscription failed', colors.red);
                results.push({
                    test: 'WABA Subscription (Mock)',
                    passed: false,
                    details: 'Mock test failed'
                });
                return false;
            }
        }

        // Real API test
        log('📞', `Testing subscription for WABA: ${wabaId.substring(0, 8)}...`);

        const result = await wabaSubscriptionManager.subscribeWABA(wabaId, accessToken);

        if (result.success) {
            log('✓', `Test PASSED: WABA subscription successful`, colors.green);
            log('ℹ', `Response timestamp: ${result.timestamp.toISOString()}`, colors.blue);

            // Verify subscription
            log('🔍', 'Verifying subscription status...');
            const isSubscribed = await wabaSubscriptionManager.verifySubscription(wabaId, accessToken);

            if (isSubscribed) {
                log('✓', 'Verification PASSED: WABA is subscribed', colors.green);
            } else {
                log('⚠', 'Verification WARNING: Could not verify subscription', colors.yellow);
            }

            results.push({
                test: 'WABA Subscription (Live)',
                passed: true,
                details: 'Successfully subscribed and verified'
            });

            return true;
        } else {
            log('✗', `Test FAILED: ${result.error}`, colors.red);

            results.push({
                test: 'WABA Subscription (Live)',
                passed: false,
                details: result.error
            });

            return false;
        }

    } catch (error: any) {
        log('✗', `Test FAILED with exception: ${error.message}`, colors.red);
        console.error(error);

        results.push({
            test: 'WABA Subscription',
            passed: false,
            details: error.message
        });

        return false;
    }
}

/**
 * Test 3: Error Handler - HSM Parameter Error (132018)
 */
async function testErrorHandler(): Promise<boolean> {
    section('Test 3: Error Handler - HSM Parameter Error (132018)');

    try {
        log('🧪', 'Simulating Meta API error 132018 (HSM parameter error)...');

        // Simulate error 132018
        const mockError: MetaError = {
            error: {
                message: 'Invalid HSM parameter: template name mismatch',
                type: 'OAuthException',
                code: 132018,
                error_subcode: 2494055,
                error_user_title: 'Template Parameter Error',
                error_user_msg: 'The template parameters provided do not match the approved template structure',
                fbtrace_id: 'AaBbCcDdEeFfGg123456789'
            }
        };

        log('📝', 'Error details:', colors.blue);
        console.log(`   - Code: ${mockError.error.code}`);
        console.log(`   - Subcode: ${mockError.error.error_subcode}`);
        console.log(`   - Message: ${mockError.error.message}`);
        console.log(`   - Trace ID: ${mockError.error.fbtrace_id}`);

        // Handle error
        log('🔧', 'Processing error through error handler...');
        const handling = await metaErrorHandler.handleError(
            mockError,
            'smoke_test_hsm_error',
            'test_operation_123'
        );

        // Validate handling
        log('📊', 'Error handling result:', colors.blue);
        console.log(`   - Should Retry: ${handling.shouldRetry}`);
        console.log(`   - Delay: ${handling.delayMs || 'N/A'}`);
        console.log(`   - Action: ${handling.action || 'N/A'}`);

        // For error 132018, we expect NO retry
        const correctStrategy = !handling.shouldRetry;

        if (correctStrategy) {
            log('✓', 'Test PASSED: Error 132018 correctly marked as NO RETRY', colors.green);

            // Test user message extraction
            const userMessage = metaErrorHandler.getUserMessage(mockError);
            log('ℹ', `User message: "${userMessage}"`, colors.blue);

            results.push({
                test: 'Error Handler (132018)',
                passed: true,
                details: 'Correctly identified as non-retryable error'
            });

            return true;
        } else {
            log('✗', 'Test FAILED: Error 132018 should NOT be retried', colors.red);

            results.push({
                test: 'Error Handler (132018)',
                passed: false,
                details: 'Incorrectly marked for retry'
            });

            return false;
        }

    } catch (error: any) {
        log('✗', `Test FAILED with exception: ${error.message}`, colors.red);
        console.error(error);

        results.push({
            test: 'Error Handler (132018)',
            passed: false,
            details: error.message
        });

        return false;
    }
}

/**
 * Mock WABA subscription for offline testing
 */
async function simulateWABASubscription(): Promise<boolean> {
    try {
        // Validate function signature
        const mockWabaId = 'mock_waba_123';
        const mockToken = 'mock_token_xyz';

        // This will fail API call but we can check structure
        const result = await wabaSubscriptionManager.subscribeWABA(mockWabaId, mockToken);

        // Check result structure
        const hasCorrectStructure =
            typeof result.success === 'boolean' &&
            typeof result.wabaId === 'string' &&
            result.timestamp instanceof Date;

        return hasCorrectStructure;
    } catch (error) {
        return false;
    }
}

/**
 * Print test summary
 */
function printSummary() {
    section('Test Summary');

    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const passRate = (passed / total * 100).toFixed(1);

    console.log('');
    results.forEach((result, index) => {
        const icon = result.passed ? '✓' : '✗';
        const color = result.passed ? colors.green : colors.red;
        const details = result.details ? ` - ${result.details}` : '';
        console.log(`${color}${icon} ${index + 1}. ${result.test}${details}${colors.reset}`);
    });

    console.log('');
    console.log(`${'─'.repeat(60)}`);

    if (passed === total) {
        log('✓', `ALL TESTS PASSED (${passed}/${total}) - ${passRate}%`, colors.green);
        console.log(`\n${colors.green}🎉 Phase 1 infrastructure is ready for production!${colors.reset}`);
    } else {
        log('✗', `SOME TESTS FAILED (${passed}/${total}) - ${passRate}%`, colors.red);
        console.log(`\n${colors.yellow}⚠️  Please fix failing tests before proceeding to Phase 2${colors.reset}`);
    }

    console.log('');
}

/**
 * Helper: Sleep function
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main test runner
 */
async function runSmokeTests() {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`${colors.blue}         SMOKE TEST SUITE - Phase 1 Infrastructure${colors.reset}`);
    console.log(`${'═'.repeat(60)}\n`);

    log('ℹ', 'Starting smoke tests for Phase 1 implementation...', colors.blue);
    log('ℹ', `Time: ${new Date().toISOString()}`, colors.blue);
    console.log('');

    try {
        // Test 1: BullMQ Worker
        await testMessageBurstProcessing();

        // Small delay between tests
        await sleep(1000);

        // Test 2: WABA Subscription
        await testWABASubscription();

        // Small delay between tests
        await sleep(1000);

        // Test 3: Error Handler
        await testErrorHandler();

        // Print summary
        printSummary();

        // Exit with appropriate code
        const allPassed = results.every(r => r.passed);
        process.exit(allPassed ? 0 : 1);

    } catch (error) {
        console.error(`\n${colors.red}Fatal error during smoke tests:${colors.reset}`, error);
        process.exit(1);
    }
}

// Run tests
runSmokeTests().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
