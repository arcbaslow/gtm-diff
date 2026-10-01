import { runAction, actionBoolean } from '../dist/integrations/github-action.js';
import { sanitizeLabel } from '../dist/reporters/shared.js';

try {
  const required = (name) => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing Action setting: ${name}`);
    return value;
  };
  process.exitCode = await runAction({
    before: required('GTM_DIFF_BEFORE'),
    after: required('GTM_DIFF_AFTER'),
    tempDirectory: required('RUNNER_TEMP'),
    outputFile: required('GITHUB_OUTPUT'),
    summaryFile: actionBoolean(process.env.GTM_DIFF_SUMMARY, true)
      ? required('GITHUB_STEP_SUMMARY')
      : undefined,
    strict: actionBoolean(process.env.GTM_DIFF_STRICT, true),
    details: actionBoolean(process.env.GTM_DIFF_DETAILS, false),
    failOnChange: actionBoolean(process.env.GTM_DIFF_FAIL_ON_CHANGE, false),
  });
} catch (error) {
  console.error(sanitizeLabel(error instanceof Error ? error.message : String(error)));
  process.exitCode = 2;
}
