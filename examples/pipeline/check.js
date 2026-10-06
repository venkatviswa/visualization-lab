function check(p) {
  const m = model(p), f = Math.round(p.reviewFindings), approve = Math.round(p.humanApproves) === 1;
  const builds = m.events.filter(e => e.station === 'build').length;
  const deploys = m.events.filter(e => e.station === 'deploy');
  const passAt = m.events.findIndex(e => e.kind === 'pass'), deployAt = m.events.findIndex(e => e.station === 'deploy');
  const okBuild = builds === 1 + f;
  const okDeploy = deploys.length === 1 && m.deployTarget === 'dev-sandbox' && !m.liveOrgTouched && passAt >= 0 && passAt < deployAt;
  const okGate = (m.improvement === 'applied') === approve;
  return {
    pass: okBuild && okDeploy && okGate,
    detail: builds + (builds === 1 ? ' build cycle' : ' build cycles') + ' for ' + f + (f === 1 ? ' review finding' : ' review findings') + '; one deployment, only after review passes, to the dev sandbox; the fix is ' + m.improvement + ' because the human ' + (approve ? 'approved.' : 'has not approved.')
  };
}
