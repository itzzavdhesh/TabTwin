import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePageStructure, createFallbackOnboarding } from '../extension/onboarding/pageAnalyzer.js';
import { createOnboardingSteps } from '../webapp/src/onboarding/useOnboarding.js';

test('analyzePageStructure extracts visible structure without reading sensitive values', () => {
  const root = {
    title: 'Customer Dashboard',
    querySelectorAll(selector) {
      if (selector === 'nav, [role="navigation"]') {
        return [{ textContent: 'Overview', tagName: 'A', hidden: false, getAttribute: () => null }];
      }
      if (selector === 'button, [role="button"], input[type="button"], input[type="submit"]') {
        return [{ textContent: 'Create report', tagName: 'BUTTON', hidden: false, getAttribute: () => null }];
      }
      if (selector === 'form') {
        return [{ textContent: 'Search projects', tagName: 'FORM', hidden: false, getAttribute: () => null }];
      }
      if (selector === 'h1, h2, h3') {
        return [{ textContent: 'Projects', tagName: 'H2', hidden: false, getAttribute: () => null }];
      }
      if (selector === 'main, [role="main"]') {
        return [{ textContent: 'Main dashboard content', tagName: 'MAIN', hidden: false, getAttribute: () => null }];
      }
      if (selector === 'input:not([type="hidden"]):not([type="password"]), textarea, [contenteditable="true"]') {
        return [{ textContent: '', tagName: 'INPUT', hidden: false, value: 'secret', getAttribute: () => null }];
      }
      return [];
    }
  };

  const summary = analyzePageStructure(root);

  assert.equal(summary.title, 'Customer Dashboard');
  assert.deepEqual(summary.navigation, ['Overview']);
  assert.deepEqual(summary.buttons, ['Create report']);
  assert.deepEqual(summary.forms, ['Search projects']);
  assert.deepEqual(summary.headings, ['Projects']);
  assert.deepEqual(summary.sections, ['Main dashboard content']);
  assert.equal(summary.inputs.length, 0);
});

test('createOnboardingSteps falls back gracefully when guidance is empty', () => {
  const steps = createOnboardingSteps({
    welcomeMessage: '',
    pageOverview: '',
    importantRegions: [],
    recommendedActions: [],
    walkthrough: ''
  });

  assert.equal(steps[0].title, 'Welcome');
  assert.match(steps[0].body, /Welcome/);
});

test('createFallbackOnboarding avoids exposing sensitive values', () => {
  const fallback = createFallbackOnboarding({ title: 'Secure page' });
  assert.match(fallback.welcomeMessage, /Welcome/);
  assert.match(fallback.pageOverview, /Secure page/);
  assert.deepEqual(fallback.importantRegions, []);
});
