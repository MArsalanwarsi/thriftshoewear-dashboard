import assert from "node:assert";

export function assertTrue(condition, message = "Expected condition to be true") {
  assert.strictEqual(Boolean(condition), true, message);
}

export function assertFalse(condition, message = "Expected condition to be false") {
  assert.strictEqual(Boolean(condition), false, message);
}

export function assertEqual(actual, expected, message) {
  assert.strictEqual(actual, expected, message);
}

export function assertNotEqual(actual, expected, message) {
  assert.notStrictEqual(actual, expected, message);
}

export function assertDeepEqual(actual, expected, message) {
  assert.deepStrictEqual(actual, expected, message);
}

export function assertIncludes(haystack, needle, message) {
  const contains = Array.isArray(haystack)
    ? haystack.includes(needle)
    : String(haystack).includes(needle);
  assert.strictEqual(contains, true, message || `Expected "${haystack}" to contain "${needle}"`);
}

export function assertStatus(response, expectedStatus, message) {
  assert.strictEqual(
    response.status,
    expectedStatus,
    message || `Expected HTTP status ${expectedStatus}, got ${response.status} with body: ${JSON.stringify(response.data || response.body)}`
  );
}

export function assertSuccess(response, message) {
  assert.strictEqual(
    response.data?.success ?? response.body?.success,
    true,
    message || `Expected response.success to be true, got ${JSON.stringify(response.data || response.body)}`
  );
}

export function assertFailure(response, expectedStatus = null, message = null) {
  if (expectedStatus) {
    assert.strictEqual(response.status, expectedStatus, message || `Expected failure status ${expectedStatus}, got ${response.status}`);
  } else {
    assert.strictEqual(response.status >= 400, true, message || `Expected HTTP >= 400, got ${response.status}`);
  }
}
