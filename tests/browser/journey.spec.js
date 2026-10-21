import { test, expect } from '@playwright/test';

test('customer and operator complete the full solar demonstration in the browser', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your next chapter is brighter.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Review your documents' }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Monthly consumption (kWh)')).toHaveValue('12000');
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Confirm document review' }).click();
  await expect(dialog).not.toBeVisible();
  for (const kind of ['property_rights', 'business_registration', 'financial_statement']) {
    await page.getByLabel('Sample document type').selectOption(kind);
    await page.getByRole('button', { name: 'Add sample document' }).click();
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'Confirm document review' }).click();
    await expect(dialog).not.toBeVisible();
  }
  await page.getByRole('button', { name: 'Operator workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Switch to demo operator' }).click();
  await page
    .getByLabel('Technical assessment evidence / update')
    .fill('Sample structural and electrical review complete for this demonstration.');
  await page.getByRole('button', { name: 'Record simulated completion' }).first().click();
  await expect(page.getByLabel('Technical assessment evidence / update')).not.toBeVisible();
  await page.getByLabel('Demo role').selectOption('customer');
  await page.getByRole('button', { name: 'Solar & suppliers', exact: true }).click();
  await page.getByRole('button', { name: 'Select this offer' }).first().click();
  await expect(page.getByRole('button', { name: 'Selected', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to financing' }).click();
  await page.getByRole('button', { name: 'Prepare application' }).first().click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download package' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('minusone-application-');
  await page.getByRole('button', { name: 'Review & authorize demo submission' }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Simulation only', { exact: true })).toBeVisible();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Authorize & run simulation' }).click();
  await expect(page.getByText('submitted · simulated', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Record a sample lender decision' }).click();
  await page.getByRole('button', { name: 'Switch to demo operator' }).click();
  await page
    .getByLabel('Decision reason / conditions')
    .fill('Sample approval for the demonstration only; no actual credit decision.');
  await page.getByRole('button', { name: 'Record sample decision' }).click();
  await expect(page.getByRole('button', { name: 'Record sample decision' })).not.toBeVisible();
  await page.getByLabel('Demo role').selectOption('customer');
  await page.getByRole('button', { name: 'Installation & impact', exact: true }).click();
  await page.getByRole('button', { name: 'Review demo commitment' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Authorize & run simulation' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Open operator workspace' }).click();
  await page.getByRole('button', { name: 'Switch to demo operator' }).click();
  for (const name of ['Installation', 'Commissioning', 'Handover']) {
    await page
      .getByLabel(`${name} evidence / update`)
      .fill(`Simulated ${name.toLowerCase()} accepted by the sample partner and customer.`);
    await page.getByRole('button', { name: 'Record simulated completion' }).first().click();
    await expect(page.getByLabel(`${name} evidence / update`)).not.toBeVisible();
  }
  await page.getByLabel('Demo role').selectOption('customer');
  await page.getByRole('button', { name: 'Installation & impact', exact: true }).click();
  await page.getByLabel('Month', { exact: true }).fill('2026-10');
  await page.getByLabel('Generation (kWh)', { exact: true }).fill('9600');
  await page.getByLabel('Additional cost this month (THB)').fill('1500');
  await page
    .getByLabel('Service issue / notes')
    .fill('Monitoring Wi-Fi intermittently disconnects.');
  await page.getByRole('button', { name: 'Record results' }).click();
  await expect(page.getByText('9,600 kWh', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Solar in operation', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Installation & impact', exact: true }).click();
  await expect(page.getByText('9,600 kWh', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('new project, manual entry, document corrections, and mobile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Business name').fill('Chiang Mai Bakery');
  await dialog.getByLabel('Location').fill('Chiang Mai, Thailand');
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByLabel('Usable roof area (m²)').fill('250');
  await page.getByLabel('Monthly consumption (kWh)', { exact: true }).fill('5000');
  await page.getByLabel('Monthly bill (THB)').fill('22500');
  await page.getByLabel('Property rights', { exact: true }).selectOption('owner');
  await page.getByRole('button', { name: 'Save business details' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Business details saved.' }),
  ).toBeVisible();
  await page.getByLabel('Upload document').setInputFiles({
    name: 'bakery-bill.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Consumption: 5,000 kWh\nTotal due: THB 22,500'),
  });
  await page.locator('button[type=submit]').filter({ hasText: 'Upload document' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByLabel('Monthly consumption (kWh)').fill('4900');
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirm document review' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByLabel('Monthly consumption (kWh)', { exact: true })).toHaveValue('4900');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your next chapter is brighter.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await page.screenshot({
    path: 'test-results/dashboard-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
});

test('quote normalization, editable assumptions, and internal operator requests', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Business name').fill('Quote Review SME');
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Solar & suppliers', exact: true }).click();
  await page.getByRole('button', { name: 'Assumptions', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Import tariff / kWh').fill('4.8');
  await dialog.getByRole('button', { name: 'Save & recalculate' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Add supplier offer' }).click();
  dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Proposal text (optional)')
    .fill(
      'Supplier: Independent Solar\nCapacity: 80 kWp\nPrice: THB 2,560,000\nGeneration: 112,000 kWh\nEquipment: Panels and inverter\nScope: Design and installation\nExclusions: Roof reinforcement\nPayment: 20% deposit, 80% completion\nWarranty: 12 years\nMaintenance: Two inspections annually',
    );
  await dialog.getByRole('button', { name: 'Extract proposal fields' }).click();
  await expect(dialog.getByLabel('Capacity (kWp)')).toHaveValue('80');
  await dialog.getByLabel('Total price (THB)').fill('2400000');
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Save reviewed offer' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Independent Solar' })).toBeVisible();
  await expect(page.getByText('Comparison details complete')).toBeVisible();
  await page.getByRole('button', { name: 'Ask your operator' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('What do you need help with?').fill('Confirm supplier warranty');
  await dialog
    .getByLabel('Details and requested next action')
    .fill('Please confirm the warranty terms against the original quotation.');
  await dialog.getByRole('button', { name: 'Create operator task' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Operator workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Switch to demo operator' }).click();
  await expect(page.getByRole('heading', { name: 'Confirm supplier warranty' })).toBeVisible();
  await page
    .getByLabel('Resolution and evidence')
    .fill('Sample operator checked the quotation and recorded the warranty terms.');
  await page.getByRole('button', { name: 'Resolve issue' }).click();
  await expect(page.getByText('resolved', { exact: true })).toBeVisible();
});
