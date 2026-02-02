#!/usr/bin/env node

/**
 * Load Testing Script using Autocannon
 *
 * Tests key API endpoints to ensure they can handle production load.
 *
 * Usage: node scripts/load-test.js
 *
 * Prerequisites:
 * - Backend server must be running on http://localhost:5000
 * - Database should be seeded with test data
 */

const autocannon = require('autocannon');
const chalk = require('chalk');

const BASE_URL = 'http://localhost:5000';

// Test configurations
const tests = [
  {
    name: 'Health Check',
    url: `${BASE_URL}/health`,
    method: 'GET',
    connections: 10,
    duration: 10,
  },
  {
    name: 'List Categories (Public)',
    url: `${BASE_URL}/api/v1/categories`,
    method: 'GET',
    connections: 50,
    duration: 15,
  },
  {
    name: 'List Products (Public)',
    url: `${BASE_URL}/api/v1/products?page=1&limit=12`,
    method: 'GET',
    connections: 100,
    duration: 20,
  },
  {
    name: 'Get Product by Slug (Public)',
    url: `${BASE_URL}/api/v1/products/slug/test-product-1`,
    method: 'GET',
    connections: 50,
    duration: 15,
  },
];

async function runTest(testConfig) {
  console.log(chalk.blue(`\n${'='.repeat(60)}`));
  console.log(chalk.blue.bold(`Running: ${testConfig.name}`));
  console.log(chalk.blue(`${'='.repeat(60)}`));
  console.log(chalk.gray(`URL: ${testConfig.url}`));
  console.log(chalk.gray(`Method: ${testConfig.method}`));
  console.log(chalk.gray(`Connections: ${testConfig.connections}`));
  console.log(chalk.gray(`Duration: ${testConfig.duration}s\n`));

  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: testConfig.url,
        method: testConfig.method,
        connections: testConfig.connections,
        duration: testConfig.duration,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (err, result) => {
        if (err) {
          console.error(chalk.red(`Error: ${err.message}`));
          reject(err);
          return;
        }

        // Display results
        console.log(chalk.green.bold('\n✓ Test Complete'));
        console.log(chalk.white('\nResults:'));
        console.log(chalk.yellow(`  Total Requests:     ${result.requests.total}`));
        console.log(chalk.yellow(`  Requests/sec:       ${result.requests.average}`));
        console.log(chalk.yellow(`  Latency (avg):      ${result.latency.mean}ms`));
        console.log(chalk.yellow(`  Latency (p95):      ${result.latency.p95}ms`));
        console.log(chalk.yellow(`  Latency (p99):      ${result.latency.p99}ms`));
        console.log(chalk.yellow(`  Throughput:         ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`));
        console.log(chalk.yellow(`  2xx responses:      ${result['2xx'] || 0}`));
        console.log(chalk.yellow(`  Non-2xx responses:  ${(result.non2xx || 0)}`));
        console.log(chalk.yellow(`  Errors:             ${result.errors}`));
        console.log(chalk.yellow(`  Timeouts:           ${result.timeouts}`));

        // Performance assessment
        const avgLatency = result.latency.mean;
        const p95Latency = result.latency.p95;
        const errorRate = ((result.errors + result.timeouts) / result.requests.total) * 100;

        console.log(chalk.white('\nPerformance Assessment:'));

        if (avgLatency < 100 && p95Latency < 200) {
          console.log(chalk.green('  ✓ Excellent: Low latency'));
        } else if (avgLatency < 300 && p95Latency < 500) {
          console.log(chalk.yellow('  ⚠ Good: Acceptable latency'));
        } else {
          console.log(chalk.red('  ✗ Poor: High latency detected'));
        }

        if (errorRate < 0.1) {
          console.log(chalk.green('  ✓ Excellent: Very low error rate'));
        } else if (errorRate < 1) {
          console.log(chalk.yellow('  ⚠ Warning: Elevated error rate'));
        } else {
          console.log(chalk.red('  ✗ Critical: High error rate'));
        }

        if (result.requests.average > 100) {
          console.log(chalk.green('  ✓ Good: High throughput'));
        } else {
          console.log(chalk.yellow('  ⚠ Low throughput'));
        }

        resolve(result);
      }
    );

    autocannon.track(instance, { renderProgressBar: true });
  });
}

async function runAllTests() {
  console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║        ELECTRICAL SUPPLIER API - LOAD TEST SUITE         ║'));
  console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝\n'));

  console.log(chalk.gray('Testing server at:'), chalk.white(BASE_URL));
  console.log(chalk.gray('Total tests:'), chalk.white(tests.length));

  const results = [];

  for (const test of tests) {
    try {
      const result = await runTest(test);
      results.push({ name: test.name, success: true, result });

      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      results.push({ name: test.name, success: false, error: error.message });
    }
  }

  // Summary
  console.log(chalk.cyan.bold(`\n${'='.repeat(60)}`));
  console.log(chalk.cyan.bold('SUMMARY'));
  console.log(chalk.cyan.bold(`${'='.repeat(60)}\n`));

  const successCount = results.filter(r => r.success).length;
  console.log(chalk.white(`Total Tests: ${tests.length}`));
  console.log(chalk.green(`Passed: ${successCount}`));
  console.log(chalk.red(`Failed: ${tests.length - successCount}\n`));

  results.forEach(r => {
    if (r.success) {
      console.log(chalk.green(`✓ ${r.name}`));
      console.log(chalk.gray(`  ${r.result.requests.average.toFixed(0)} req/s, ${r.result.latency.mean.toFixed(1)}ms avg latency\n`));
    } else {
      console.log(chalk.red(`✗ ${r.name}`));
      console.log(chalk.red(`  Error: ${r.error}\n`));
    }
  });

  if (successCount === tests.length) {
    console.log(chalk.green.bold('✓ All load tests passed successfully!\n'));
    process.exit(0);
  } else {
    console.log(chalk.red.bold('✗ Some load tests failed. Please review the results above.\n'));
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  console.log(chalk.gray('Checking if server is running...'));

  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.log(chalk.red('\n✗ Server is not running at'), chalk.white(BASE_URL));
    console.log(chalk.yellow('\nPlease start the backend server first:'));
    console.log(chalk.white('  cd backend && npm run dev\n'));
    process.exit(1);
  }

  console.log(chalk.green('✓ Server is running\n'));

  await runAllTests();
})();
