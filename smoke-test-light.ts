/**
 * Lightweight Smoke Test - No Redis Required
 * 
 * Tests critical components that don't require Redis:
 * - Error Handler (132018)
 * - WABA Subscription (Mock)
 * - Rate Limiter (In-Memory)
 */

import { metaErrorHandler, MetaError } from './src/lib/meta/meta-error-handler';
import { wabaSubscriptionManager } from './src/lib/meta/waba-subscription-manager';
import { metaRateLimiter } from './src/lib/meta/rate-limiter';

// ANSI colors
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
};

function log(emoji: string, message: string, color?: string) {
    console.log(`${color || colors.reset}${emoji} ${message}${colors.reset}`);
}

function section(title: string) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${colors.blue}${title}${colors.reset}`);
    console.log(`${'='.repeat(60)}\n`);
}

const results: { test: string; passed: boolean; details?: string }[] = [];

/**
 * Test 1: Error Handler - HSM Parameter Error (132018)
 */
async function testErrorHandler132018(): Promise<boolean> {
    section('Test 1: Error Handler - Code 132018 (HSM Parameter)');

    try {
        log('🧪', 'Simulating Meta API error 132018...');

        const mockError: MetaError = {
            error: {
                message: 'Invalid HSM parameter: template name mismatch',
                type: 'OAuthException',
                code: 132018,
                error_subcode: 2494055,
                error_user_title: 'Template Parameter Error',
                error_user_msg: 'The template parameters provided do not match the approved template structure',
                fbtrace_id: 'AaBbCcDdEeFfGg_SmokeTest'
            }
        };

        log('📝', 'Error details:', colors.blue);
        console.log(`   - Code: ${mockError.error.code}`);
        console.log(`   - Message: ${mockError.error.message}`);
        console.log(`   - Trace ID: ${mockError.error.fbtrace_id}`);

        const handling = await metaErrorHandler.handleError(
            mockError,
            'smoke_test_hsm',
            'test_op_123'
        );

        log('📊', 'Handler response:', colors.blue);
        console.log(`   - Should Retry: ${handling.shouldRetry}`);
        console.log(`   - Delay: ${handling.delayMs || 'N/A'}`);

        // Validate: Error 132018 should NOT retry
        if (!handling.shouldRetry) {
            log('✓', 'PASSED: Error 132018 correctly marked as NO RETRY', colors.green);

            const userMsg = metaErrorHandler.getUserMessage(mockError);
            log('ℹ', `User message: "${userMsg}"`, colors.blue);

            results.push({
                test: 'Error Handler (132018)',
                passed: true,
                details: 'Correct non-retry strategy'
            });
            return true;
        } else {
            log('✗', 'FAILED: Should NOT retry HSM errors', colors.red);
            results.push({
                test: 'Error Handler (132018)',
                passed: false,
                details: 'Incorrectly marked for retry'
            });
            return false;
        }

    } catch (error: any) {
        log('✗', `FAILED: ${error.message}`, colors.red);
        results.push({
            test: 'Error Handler (132018)',
            passed: false,
            details: error.message
        });
        return false;
    }
}

/**
 * Test 2: Error Handler - Cursor Expired (131059)
 */
async function testErrorHandlerCursorExpired(): Promise<boolean> {
    section('Test 2: Error Handler - Cursor Expired (131059)');

    try {
        log('🧪', 'Simulating cursor expiration error...');

        const mockError: MetaError = {
            error: {
                message: 'Invalid cursor. The cursor has either expired or become corrupted',
                type: 'GraphMethodException',
                code: 131059,
                fbtrace_id: 'CursorTest_12345'
            }
        };

        log('📝', 'Error details:', colors.blue);
        console.log(`   - Code: ${mockError.error.code}`);
        console.log(`   - Message: ${mockError.error.message}`);

        const handling = await metaErrorHandler.handleError(
            mockError,
            'smoke_test_cursor',
            'pagination_op_456'
        );

        log('📊', 'Handler response:', colors.blue);
        console.log(`   - Should Retry: ${handling.shouldRetry}`);
        console.log(`   - Action: ${handling.action || 'N/A'}`);

        // Validate: Should retry with restart pagination action
        if (handling.shouldRetry && handling.action === 'restart_pagination') {
            log('✓', 'PASSED: Cursor error triggers pagination restart', colors.green);
            results.push({
                test: 'Error Handler (Cursor)',
                passed: true,
                details: 'Correct restart strategy'
            });
            return true;
        } else {
            log('✗', 'FAILED: Should restart pagination', colors.red);
            results.push({
                test: 'Error Handler (Cursor)',
                passed: false,
                details: `Got action: ${handling.action}`
            });
            return false;
        }

    } catch (error: any) {
        log('✗', `FAILED: ${error.message}`, colors.red);
        results.push({
            test: 'Error Handler (Cursor)',
            passed: false,
            details: error.message
        });
        return false;
    }
}

/**
 * Test 3: Rate Limiter
 */
async function testRateLimiter(): Promise<boolean> {
    section('Test 3: Rate Limiter - Token Bucket');

    try {
        const testWabaId = 'smoke_test_waba';

        log('🔧', 'Testing rate limiter with burst...');

        // Try consuming 100 tokens rapidly
        let consumed = 0;
        const startTime = Date.now();

        for (let i = 0; i < 100; i++) {
            const allowed = await metaRateLimiter.tryConsume(testWabaId, 1);
            if (allowed) consumed++;
        }

        const duration = Date.now() - startTime;

        log('📊', 'Rate limiter results:', colors.blue);
        console.log(`   - Consumed: ${consumed}/100 tokens`);
        console.log(`   - Duration: ${duration}ms`);

        // Get metrics
        const metrics = metaRateLimiter.getMetrics(testWabaId);
        console.log(`   - Available: ${metrics.availableTokens.toFixed(0)}/${metrics.maxTokens}`);
        console.log(`   - Utilization: ${metrics.utilizationPercent.toFixed(1)}%`);

        // Should consume at least some tokens
        if (consumed > 0) {
            log('✓', `PASSED: Consumed ${consumed} tokens successfully`, colors.green);
            results.push({
                test: 'Rate Limiter',
                passed: true,
                details: `${consumed}/100 tokens consumed in ${duration}ms`
            });
            return true;
        } else {
            log('✗', 'FAILED: Could not consume any tokens', colors.red);
            results.push({
                test: 'Rate Limiter',
                passed: false,
                details: 'No tokens consumed'
            });
            return false;
        }

    } catch (error: any) {
        log('✗', `FAILED: ${error.message}`, colors.red);
        results.push({
            test: 'Rate Limiter',
            passed: false,
            details: error.message
        });
        return false;
    }
}

/**
 * Test 4: WABA Subscription - Structure Test
 */
async function testWABASubscriptionStructure(): Promise<boolean> {
    section('Test 4: WABA Subscription - API Structure');

    try {
        log('🔍', 'Testing WABA subscription function structure...');

        // Test with invalid credentials (will fail API but validates structure)
        const mockWabaId = 'mock_waba_test_123';
        const mockToken = 'mock_token_xyz';

        const result = await wabaSubscriptionManager.subscribeWABA(mockWabaId, mockToken);

        // Check result structure
        const hasCorrectStructure =
            typeof result.success === 'boolean' &&
            typeof result.wabaId === 'string' &&
            result.timestamp instanceof Date &&
            result.wabaId === mockWabaId;

        log('📊', 'Result structure:', colors.blue);
        console.log(`   - Has success field: ${typeof result.success === 'boolean'}`);
        console.log(`   - Has wabaId field: ${typeof result.wabaId === 'string'}`);
        console.log(`   - Has timestamp field: ${result.timestamp instanceof Date}`);
        console.log(`   - WABA ID matches: ${result.wabaId === mockWabaId}`);

        if (hasCorrectStructure) {
            log('✓', 'PASSED: Subscription structure validated', colors.green);
            results.push({
                test: 'WABA Subscription',
                passed: true,
                details: 'API structure and error handling verified'
            });
            return true;
        } else {
            log('✗', 'FAILED: Invalid structure', colors.red);
            results.push({
                test: 'WABA Subscription',
                passed: false,
                details: 'Missing required fields'
            });
            return false;
        }

    } catch (error: any) {
        log('✗', `FAILED: ${error.message}`, colors.red);
        results.push({
            test: 'WABA Subscription',
            passed: false,
            details: error.message
        });
        return false;
    }
}

/**
 * Print Summary
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
        console.log(`\n${colors.green}🎉 Core Phase 1 components validated!${colors.reset}`);
        console.log(`\n${colors.yellow}Note: BullMQ/Redis test requires Redis server running${colors.reset}`);
        console.log(`${colors.yellow}Run full smoke-test after setting up Redis${colors.reset}\n`);
    } else {
        log('✗', `SOME TESTS FAILED (${passed}/${total}) - ${passRate}%`, colors.red);
        console.log(`\n${colors.yellow}⚠️  Please fix failing tests before Phase 2${colors.reset}\n`);
    }
}

/**
 * Main
 */
async function runLightTests() {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`${colors.blue}    SMOKE TEST - Phase 1 (No Redis Required)${colors.reset}`);
    console.log(`${'═'.repeat(60)}\n`);

    log('ℹ', 'Running lightweight smoke tests...', colors.blue);
    log('ℹ', `Time: ${new Date().toISOString()}`, colors.blue);
    console.log('');

    try {
        await testErrorHandler132018();
        await testErrorHandlerCursorExpired();
        await testRateLimiter();
        await testWABASubscriptionStructure();

        printSummary();

        const allPassed = results.every(r => r.passed);
        process.exit(allPassed ? 0 : 1);

    } catch (error) {
        console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
        process.exit(1);
    }
}

runLightTests();
