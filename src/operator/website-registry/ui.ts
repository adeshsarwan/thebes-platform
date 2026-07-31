import type { AdUnit, ServingConfiguration, WebsiteDetail, WebsiteSummary } from './types.js';

interface FlashMessage {
  kind: 'notice' | 'error';
  message: string;
}

const escapeHtml = (value: unknown): string =>
  String(value)
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');

const checked = (value: boolean): string => (value ? ' checked' : '');
const selected = (value: boolean): string => (value ? ' selected' : '');

const renderFlash = (flash?: FlashMessage): string =>
  flash ? `<p class="flash flash-${flash.kind}">${escapeHtml(flash.message)}</p>` : '';

const renderShell = ({
  title,
  active = 'Website Registry',
  flash,
  body,
}: {
  title: string;
  active?: string;
  flash?: FlashMessage | undefined;
  body: string;
}): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} - Thebes Platform</title>
    <style>
      :root {
        color-scheme: light;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f6f7f9;
        color: #172033;
      }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; }
      a { color: #134fba; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .layout { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
      .side {
        background: #101828;
        color: #f8fafc;
        padding: 24px 18px;
      }
      .brand { font-size: 18px; font-weight: 700; margin-bottom: 28px; }
      .nav { display: grid; gap: 8px; }
      .nav a,
      .nav span {
        border-radius: 6px;
        color: #d7dee8;
        display: block;
        padding: 10px 12px;
      }
      .nav .active { background: #2557d6; color: white; }
      .nav .disabled { color: #7f8a9d; cursor: not-allowed; }
      main { padding: 28px; }
      .topline {
        align-items: center;
        display: flex;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
      }
      h1 { font-size: 24px; line-height: 1.2; margin: 0; }
      h2 { font-size: 18px; line-height: 1.3; margin: 0 0 14px; }
      h3 { font-size: 15px; line-height: 1.3; margin: 0 0 10px; }
      .crumb { color: #526173; font-size: 14px; margin-bottom: 8px; }
      .section {
        background: white;
        border: 1px solid #d9dee7;
        border-radius: 8px;
        margin-bottom: 18px;
        padding: 18px;
      }
      .grid { display: grid; gap: 14px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .grid-2 { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .ad-unit-grid {
        align-items: end;
        display: grid;
        gap: 14px;
        grid-template-columns: minmax(150px, 1fr) minmax(320px, 2fr) 140px auto;
      }
      label { color: #344054; display: grid; font-size: 13px; font-weight: 600; gap: 6px; }
      input,
      select {
        border: 1px solid #c8d0dc;
        border-radius: 6px;
        color: #172033;
        font: inherit;
        min-height: 38px;
        padding: 8px 10px;
        width: 100%;
      }
      input[type="checkbox"],
      input[type="radio"] {
        min-height: auto;
        width: auto;
      }
      .inline { align-items: center; display: flex; gap: 8px; }
      .actions { align-items: center; display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
      button,
      .button {
        background: #2557d6;
        border: 1px solid #2557d6;
        border-radius: 6px;
        color: white;
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        font-weight: 650;
        justify-content: center;
        min-height: 38px;
        padding: 8px 12px;
      }
      button.secondary,
      .button.secondary {
        background: white;
        color: #2557d6;
      }
      button.danger {
        background: #b42318;
        border-color: #b42318;
      }
      button:disabled,
      input:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
      table { border-collapse: collapse; font-size: 14px; width: 100%; }
      th,
      td {
        border-bottom: 1px solid #e4e8ef;
        padding: 10px 8px;
        text-align: left;
        vertical-align: middle;
      }
      th { color: #475467; font-size: 12px; text-transform: uppercase; }
      .status {
        border-radius: 999px;
        display: inline-flex;
        font-size: 12px;
        font-weight: 700;
        padding: 4px 8px;
      }
      .status.enabled { background: #dcfae6; color: #067647; }
      .status.disabled { background: #f2f4f7; color: #475467; }
      .muted { color: #667085; }
      .flash {
        border-radius: 6px;
        font-weight: 650;
        margin: 0 0 18px;
        padding: 12px 14px;
      }
      .flash-notice { background: #e8f1ff; color: #163c91; }
      .flash-error { background: #fee4e2; color: #912018; }
      .placeholder {
        border: 1px dashed #b8c0cc;
        border-radius: 6px;
        color: #667085;
        padding: 14px;
      }
      .split-row {
        align-items: end;
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr)) repeat(5, auto);
      }
      @media (max-width: 900px) {
        .layout { grid-template-columns: 1fr; }
        .side { position: static; }
        .grid,
        .grid-2,
        .ad-unit-grid,
        .split-row { grid-template-columns: 1fr; }
        main { padding: 18px; }
      }
    </style>
  </head>
  <body>
    <div class="layout">
      <aside class="side">
        <div class="brand">Thebes Platform</div>
        <nav class="nav" aria-label="Operator modules">
          ${renderNavigationItem('Website Registry', '/operator/websites', active)}
          <span class="disabled">Pricing</span>
          <span class="disabled">Retry</span>
          <span class="disabled">Experiments</span>
          <span class="disabled">Reporting</span>
        </nav>
      </aside>
      <main>
        ${renderFlash(flash)}
        ${body}
      </main>
    </div>
  </body>
</html>`;

const renderNavigationItem = (label: string, href: string, active: string): string =>
  `<a class="${active === label ? 'active' : ''}" href="${href}">${escapeHtml(label)}</a>`;

const renderStatus = (enabled: boolean): string =>
  `<span class="status ${enabled ? 'enabled' : 'disabled'}">${enabled ? 'Enabled' : 'Disabled'}</span>`;

export const renderWebsiteList = ({
  websites,
  flash,
}: {
  websites: WebsiteSummary[];
  flash?: FlashMessage | undefined;
}): string =>
  renderShell({
    title: 'Website Registry',
    flash,
    body: `
      <div class="topline">
        <div>
          <div class="crumb">Website Registry</div>
          <h1>Websites</h1>
        </div>
      </div>
      <section class="section" aria-labelledby="create-website-heading">
        <h2 id="create-website-heading">Create Website</h2>
        <form method="post" action="/operator/websites">
          <div class="grid">
            <label>Domain
              <input name="domain" autocomplete="off" placeholder="example.com" required>
            </label>
            <label>Environment
              <select name="environment">
                <option value="pilot">Pilot</option>
                <option value="production" disabled>Production</option>
              </select>
              <span class="muted">Production not yet enabled.</span>
            </label>
            <label>GAM Network Code
              <input name="gam_network_code" inputmode="numeric" autocomplete="off" required>
            </label>
            <label class="inline">
              <input type="checkbox" name="enabled" checked>
              Website Enabled
            </label>
          </div>
          <div class="actions">
            <button type="submit">Create</button>
          </div>
        </form>
      </section>
      <section class="section" aria-labelledby="websites-heading">
        <h2 id="websites-heading">Registry</h2>
        <table>
          <thead>
            <tr>
              <th>Domain</th>
              <th>Environment</th>
              <th>GAM Network Code</th>
              <th>Status</th>
              <th>Active Version</th>
              <th>Ad Units</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${
              websites.length === 0
                ? '<tr><td colspan="7" class="muted">No pilot websites found.</td></tr>'
                : websites.map(renderWebsiteRow).join('')
            }
          </tbody>
        </table>
      </section>
    `,
  });

const renderWebsiteRow = (website: WebsiteSummary): string => `
  <tr>
    <td>${escapeHtml(website.domain)}</td>
    <td>${escapeHtml(website.environment)}</td>
    <td>${escapeHtml(website.gam_network_code)}</td>
    <td>${renderStatus(website.enabled)}</td>
    <td>${escapeHtml(website.active_config_version)}</td>
    <td>${escapeHtml(website.ad_unit_count)}</td>
    <td><a class="button secondary" href="/operator/websites/${escapeHtml(website.website_id)}">Open</a></td>
  </tr>
`;

export const renderWebsiteDetail = ({
  website,
  flash,
}: {
  website: WebsiteDetail;
  flash?: FlashMessage | undefined;
}): string =>
  renderShell({
    title: website.domain,
    flash,
    body: `
      <div class="topline">
        <div>
          <div class="crumb"><a href="/operator/websites">Website</a> &gt; ${escapeHtml(website.domain)}</div>
          <h1>${escapeHtml(website.domain)}</h1>
          <p class="muted">Active config version ${escapeHtml(website.active_config_version)}.</p>
        </div>
        <a class="button secondary" href="/operator/websites">Back</a>
      </div>
      ${renderGeneralSection(website)}
      ${renderAdUnitsSection(website)}
      ${renderConfigurationSection(website.configuration, website.website_id)}
    `,
  });

const renderGeneralSection = (website: WebsiteDetail): string => `
  <section class="section" aria-labelledby="general-heading">
    <div class="crumb">Website &gt; General</div>
    <h2 id="general-heading">General</h2>
    <form method="post" action="/operator/websites/${escapeHtml(website.website_id)}/general">
      <div class="grid">
        <label>Domain
          <input name="domain" value="${escapeHtml(website.domain)}" autocomplete="off" required>
        </label>
        <label>Environment
          <select name="environment">
            <option value="pilot"${selected(website.environment === 'pilot')}>Pilot</option>
            <option value="production" disabled>Production</option>
          </select>
          <span class="muted">Production not yet enabled.</span>
        </label>
        <label>GAM Network Code
          <input name="gam_network_code" inputmode="numeric" value="${escapeHtml(
            website.gam_network_code,
          )}" autocomplete="off" required>
        </label>
        <label class="inline">
          <input type="checkbox" name="enabled"${checked(website.enabled)}>
          Website Enabled
        </label>
      </div>
      <div class="actions">
        <button type="submit">Save General</button>
      </div>
    </form>
  </section>
`;

const renderAdUnitsSection = (website: WebsiteDetail): string => `
  <section class="section" aria-labelledby="ad-units-heading">
    <div class="crumb">Website &gt; Ad Units</div>
    <h2 id="ad-units-heading">Ad Units</h2>
    <table>
      <thead>
        <tr>
          <th>Placement Key</th>
          <th>GAM Ad Unit Path</th>
          <th>Enabled</th>
          <th>Edit</th>
          <th>Delete</th>
        </tr>
      </thead>
      <tbody>
        ${
          website.ad_units.length === 0
            ? '<tr><td colspan="5" class="muted">No ad units configured.</td></tr>'
            : website.ad_units.map((adUnit) => renderAdUnitRow(website, adUnit)).join('')
        }
      </tbody>
    </table>
    <h3>Add Ad Unit</h3>
    <form method="post" action="/operator/websites/${escapeHtml(website.website_id)}/ad-units">
      <div class="ad-unit-grid">
        <label>Placement Key
          <input name="placement_key" autocomplete="off" placeholder="native" required>
        </label>
        <label>GAM Ad Unit Path
          <input name="gam_ad_unit_path" autocomplete="off" placeholder="/${escapeHtml(
            website.gam_network_code,
          )}/example_Native" required>
        </label>
        <label class="inline">
          <input type="checkbox" name="enabled" checked>
          Enabled
        </label>
      </div>
      <div class="actions">
        <button type="submit">Add Ad Unit</button>
      </div>
    </form>
  </section>
`;

const renderAdUnitRow = (website: WebsiteDetail, adUnit: AdUnit): string => `
  <tr>
    <td colspan="5">
      <form method="post" action="/operator/websites/${escapeHtml(
        website.website_id,
      )}/ad-units/${escapeHtml(adUnit.placement_id)}">
        <div class="ad-unit-grid">
          <label>Placement Key
            <input name="placement_key" value="${escapeHtml(adUnit.placement_key)}" autocomplete="off" required>
          </label>
          <label>GAM Ad Unit Path
            <input name="gam_ad_unit_path" value="${escapeHtml(
              adUnit.gam_ad_unit_path,
            )}" autocomplete="off" required>
          </label>
          <label class="inline">
            <input type="checkbox" name="enabled"${checked(adUnit.enabled)}>
            Enabled
          </label>
          <div class="actions">
            <button type="submit">Edit</button>
            <button class="danger" type="submit" formaction="/operator/websites/${escapeHtml(
              website.website_id,
            )}/ad-units/${escapeHtml(adUnit.placement_id)}/delete">Delete</button>
          </div>
        </div>
      </form>
    </td>
  </tr>
`;

const renderConfigurationSection = (
  configuration: ServingConfiguration,
  websiteId: string,
): string => `
  <section class="section" aria-labelledby="configuration-heading">
    <div class="crumb">Website &gt; Configuration</div>
    <h2 id="configuration-heading">Configuration</h2>
    <form method="post" action="/operator/websites/${escapeHtml(websiteId)}/configuration">
      <input type="hidden" name="environment" value="pilot">
      <section aria-labelledby="serving-mode-heading">
        <h3 id="serving-mode-heading">Serving Mode</h3>
        <div class="grid-2">
          ${renderServingModeRadio(configuration, 'default', 'Default')}
          ${renderServingModeRadio(configuration, 'waterfall', 'Waterfall')}
          ${renderServingModeRadio(configuration, 'experiment', 'Experiment')}
        </div>
      </section>
      <section aria-labelledby="traffic-split-heading">
        <h3 id="traffic-split-heading">Traffic Split</h3>
        <div class="split-row">
          <label>Control
            <input name="control_percentage" type="number" min="0" max="100" step="1" value="${escapeHtml(
              configuration.traffic_split.control_percentage,
            )}" required>
          </label>
          <label>Experiment
            <input name="experiment_percentage" type="number" min="0" max="100" step="1" value="${escapeHtml(
              configuration.traffic_split.experiment_percentage,
            )}" required>
          </label>
          <button class="secondary" type="submit" name="preset" value="90-10">90 / 10</button>
          <button class="secondary" type="submit" name="preset" value="80-20">80 / 20</button>
          <button class="secondary" type="submit" name="preset" value="70-30">70 / 30</button>
          <button class="secondary" type="submit" name="preset" value="60-40">60 / 40</button>
          <button class="secondary" type="submit" name="preset" value="50-50">50 / 50</button>
        </div>
      </section>
      <section aria-labelledby="pricing-heading">
        <h3 id="pricing-heading">Pricing</h3>
        <div class="placeholder">Coming in a later story.</div>
      </section>
      <section aria-labelledby="retry-heading">
        <h3 id="retry-heading">Retry</h3>
        <div class="placeholder">Coming in a later story.</div>
      </section>
      <div class="actions">
        <button type="submit">Save Configuration</button>
      </div>
    </form>
  </section>
`;

const renderServingModeRadio = (
  configuration: ServingConfiguration,
  value: ServingConfiguration['mode'],
  label: string,
): string => `
  <label class="inline">
    <input type="radio" name="mode" value="${value}"${checked(configuration.mode === value)}>
    ${escapeHtml(label)}
  </label>
`;
