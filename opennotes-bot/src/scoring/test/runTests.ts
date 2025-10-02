/**
 * Test runner for scoring algorithm components
 */

import { testMatrixFactorization } from './matrixFactorization.test.js';

async function runAllTests(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Running Community Notes Scoring Algorithm Tests');
  console.log('='.repeat(60));

  const tests = [
    {
      name: 'Matrix Factorization Algorithm',
      test: testMatrixFactorization,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, test } of tests) {
    console.log(`\n${'='.repeat(20)} ${name} ${'='.repeat(20)}`);

    try {
      const result = await test();

      if (result.success) {
        console.log(`✅ ${name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${name}: FAILED`);
        console.log(`Error: ${result.error}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}: FAILED WITH EXCEPTION`);
      console.error(error);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed > 0) {
    console.log('\n❌ Some tests failed. Please review the output above.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}