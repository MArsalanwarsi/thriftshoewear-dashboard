#!/usr/bin/env node
import { getTestClient, teardownTestEnvironment } from "./helpers/client.js";
import { runTier1 } from "./tier1-feature-coverage.test.js";
import { runTier2 } from "./tier2-boundary-cases.test.js";
import { runTier3 } from "./tier3-pairwise-combinations.test.js";
import { runTier4 } from "./tier4-workloads.test.js";
import { runTier5 } from "./tier5-adversarial-hardening.test.js";

// ANSI terminal colors
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const GRAY = "\x1b[90m";

// CLI arguments
const args = process.argv.slice(2);
const tierArg = args.find((a, i) => args[i - 1] === "--tier" || a.startsWith("--tier="))?.replace("--tier=", "");
const urlArg = args.find((a, i) => args[i - 1] === "--url" || a.startsWith("--url="))?.replace("--url=", "");

if (urlArg) {
  process.env.TEST_BASE_URL = urlArg;
}

async function main() {
  const startTime = Date.now();
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   THRIFT SHOE WEAR DASHBOARD — 5-TIER E2E TEST RUNNER                ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);

  let client;
  try {
    client = await getTestClient();
  } catch (err) {
    console.error(`${RED}Failed to initialize test client: ${err.message}${RESET}`);
    process.exit(1);
  }

  console.log(`${GRAY}Target Base URL:${RESET} ${BOLD}${client.baseUrl}${RESET}`);
  console.log(`${GRAY}Execution Mode:${RESET}  ${process.env.TEST_BASE_URL ? "Live HTTP Server" : "Embedded Conforming Server"}`);
  console.log(`${GRAY}Started At:${RESET}      ${new Date().toISOString()}\n`);

  const suiteSummaries = [];
  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;

  async function executeSuite(suiteTitle, suiteFn) {
    if (client.server) client.server.resetState();
    console.log(`${BOLD}--- Running Suite: ${suiteTitle} ---${RESET}`);
    const results = await suiteFn(client);
    let suitePassed = 0;
    let suiteFailed = 0;

    for (const r of results) {
      if (r.status === "PASS") {
        suitePassed++;
        console.log(`  ${GREEN}✓ PASS${RESET}  ${r.name} ${GRAY}(${r.durationMs}ms)${RESET}`);
      } else {
        suiteFailed++;
        console.log(`  ${RED}✗ FAIL${RESET}  ${r.name} ${GRAY}(${r.durationMs}ms)${RESET}`);
        if (r.error) {
          console.log(`         ${RED}Error: ${r.error}${RESET}`);
        }
      }
    }

    grandTotal += results.length;
    grandPassed += suitePassed;
    grandFailed += suiteFailed;

    suiteSummaries.push({
      title: suiteTitle,
      total: results.length,
      passed: suitePassed,
      failed: suiteFailed,
    });
    console.log();
  }

  try {
    if (tierArg) {
      if (tierArg === "1") await executeSuite("Tier 1: Feature Coverage (20 Features, 100 Tests)", runTier1);
      else if (tierArg === "2") await executeSuite("Tier 2: Boundary & Corner Cases (20 Features, 100 Tests)", runTier2);
      else if (tierArg === "3") await executeSuite("Tier 3: Pairwise Combinations (20 Tests)", runTier3);
      else if (tierArg === "4") await executeSuite("Tier 4: Real-World Application Scenarios (5 Workflows)", runTier4);
      else if (tierArg === "5") await executeSuite("Tier 5: White-Box Adversarial Hardening (25 Tests)", runTier5);
      else {
        console.error(`${RED}Unknown tier: ${tierArg}${RESET}`);
        process.exit(1);
      }
    } else {
      // Default: Run all 5 tiers
      await executeSuite("Tier 1: Feature Coverage (20 Features, 100 Tests)", runTier1);
      await executeSuite("Tier 2: Boundary & Corner Cases (20 Features, 100 Tests)", runTier2);
      await executeSuite("Tier 3: Pairwise Combinations (20 Tests)", runTier3);
      await executeSuite("Tier 4: Real-World Application Scenarios (5 Workflows)", runTier4);
      await executeSuite("Tier 5: White-Box Adversarial Hardening (25 Tests)", runTier5);
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
    console.log(`${BOLD}${CYAN}                        TEST EXECUTION SUMMARY                        ${RESET}`);
    console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
    console.log(`\n  ${"Suite".padEnd(46)} | Total | Pass | Fail | Status`);
    console.log(`  ${"-".repeat(46)}-+-------+------+------+-------`);

    for (const s of suiteSummaries) {
      const statusStr = s.failed === 0 ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
      console.log(
        `  ${s.title.padEnd(46)} | ${String(s.total).padStart(5)} | ${String(s.passed).padStart(4)} | ${String(s.failed).padStart(4)} | ${statusStr}`
      );
    }

    console.log(`  ${"-".repeat(46)}-+-------+------+------+-------`);
    const overallStatus = grandFailed === 0 ? `${GREEN}${BOLD}PASSED (100%)${RESET}` : `${RED}${BOLD}FAILED${RESET}`;
    console.log(
      `  ${BOLD}${"GRAND TOTAL".padEnd(46)}${RESET} | ${BOLD}${String(grandTotal).padStart(5)}${RESET} | ${BOLD}${String(grandPassed).padStart(4)}${RESET} | ${BOLD}${String(grandFailed).padStart(4)}${RESET} | ${overallStatus}\n`
    );

    console.log(`  ${GRAY}Total Execution Duration:${RESET} ${BOLD}${durationSec}s${RESET}`);
    console.log(`  ${GRAY}Completed At:${RESET}             ${new Date().toISOString()}\n`);

    if (grandFailed > 0) {
      console.error(`${RED}${BOLD}Suite run completed with ${grandFailed} failure(s).${RESET}`);
      process.exit(1);
    } else {
      console.log(`${GREEN}${BOLD}All ${grandTotal} test cases completed successfully!${RESET}\n`);
      process.exit(0);
    }
  } finally {
    await teardownTestEnvironment();
  }
}

main().catch((err) => {
  console.error(`${RED}Fatal error running test suite:${RESET}`, err);
  process.exit(1);
});
