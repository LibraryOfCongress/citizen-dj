if (window.location.hostname === "citizendj.labs.loc.gov.s3-website-us-east-1.amazonaws.com") {
  var path = window.location.pathname;
  var q = window.location.search;
  if (!q) q = "";
  window.location.replace("https://citizen-dj.labs.loc.gov" + path + q);
}
