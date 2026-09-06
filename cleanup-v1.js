const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const ARCHIVE = path.join(ROOT, "archive");
const EVIDENCE = path.join(ROOT, "evidence");
const REPORTS = path.join(ROOT, "reports");

console.log("");
console.log("==========================================");
console.log(" ARC AGENT TRUST — CLEANUP v1");
console.log("==========================================");
console.log("");

console.log("Working directory:");
console.log(ROOT);
console.log("");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function moveFile(file, destinationDir) {
  const source = path.join(ROOT, file);
  const destination = path.join(
    destinationDir,
    file
  );

  if (!fs.existsSync(source)) {
    return false;
  }

  ensureDir(destinationDir);

  fs.renameSync(
    source,
    destination
  );

  return true;
}

function copyFile(file, destinationDir) {
  const source = path.join(ROOT, file);
  const destination = path.join(
    destinationDir,
    file
  );

  if (!fs.existsSync(source)) {
    return false;
  }

  ensureDir(destinationDir);

  fs.copyFileSync(
    source,
    destination
  );

  return true;
}

/*
==================================================
DIRECTORIES
==================================================
*/

ensureDir(ARCHIVE);
ensureDir(EVIDENCE);
ensureDir(REPORTS);

console.log("Created / verified:");
console.log("  archive/");
console.log("  evidence/");
console.log("  reports/");
console.log("");

/*
==================================================
CURRENT V60 PRODUCT FILES
==================================================

Keep these in root for now.
==================================================
*/

const keepRoot = [
  "agent-trust-console-v60.js",
  "agent-trust-v60.json",
  "agent-trust-v60.md",
  "agent-trust-v60-summary.txt",
  "package.json",
  "package-lock.json",
];

console.log("==========================================");
console.log(" ROOT FILES");
console.log("==========================================");
console.log("");

for (const file of keepRoot) {
  if (fs.existsSync(path.join(ROOT, file))) {
    console.log("KEEP:", file);
  }
}

console.log("");

/*
==================================================
IMPORTANT EVIDENCE FILES
==================================================

These are copied, not moved.

That means the original files remain
available in the root until we verify everything.
==================================================
*/

const evidenceFiles = [
  "agent-structural-v43-5.json",
  "agent-structural-review-v44.json",

  "agent-validation-registry-v47.json",
  "agent-independent-target-validator-v49.json",
  "agent-validator-relationship-v50.json",
  "agent-validator-identity-forensics-v51.json",
  "agent-provider-identity-activity-v52.json",

  "agent-independent-target-registry-v57.json",
  "agent-validation-timeline-v58.json",
  "agent-validator-deep-forensics-v59.json",

  "FINAL-REPORT-v55.1.json",
  "FINAL-TRUST-ASSESSMENT-v56.json",

  "agent-evidence-gap-v35.json",
  "agent-evidence-independence-v28-1.json",
  "agent-evidence-scoring-v31.json",
  "agent-evidence-calibration-v32.json",

  "agent-identity-correlation-v22.json",
  "agent-metadata-independence-v42.json",
  "agent-metadata-quality-v20.json",

  "agent-behavioral-profile-v26.json",
  "agent-validator-behavior-v40.json",
  "agent-anomaly-detection-v27.json",
  "agent-risk-correlation-v29.json",
];

console.log("==========================================");
console.log(" EVIDENCE FILES");
console.log("==========================================");
console.log("");

let copiedEvidence = 0;

for (const file of evidenceFiles) {

  if (
    copyFile(
      file,
      EVIDENCE
    )
  ) {

    console.log(
      "COPIED:",
      file
    );

    copiedEvidence++;
  }
}

console.log("");

console.log(
  "Evidence copied:",
  `${copiedEvidence}/${evidenceFiles.length}`
);

console.log("");

/*
==================================================
FINAL REPORTS
==================================================

Copy final reports to reports/.
==================================================
*/

const reportFiles = [
  "FINAL-REPORT-v55.1.md",
  "FINAL-REPORT-v55.1.json",
  "FINAL-REPORT-v55.1-summary.txt",

  "FINAL-TRUST-ASSESSMENT-v56.md",
  "FINAL-TRUST-ASSESSMENT-v56.json",
  "FINAL-TRUST-ASSESSMENT-v56-summary.txt",

  "agent-trust-v60.md",
  "agent-trust-v60.json",
  "agent-trust-v60-summary.txt",
];

console.log("==========================================");
console.log(" REPORT FILES");
console.log("==========================================");
console.log("");

let copiedReports = 0;

for (const file of reportFiles) {

  if (
    copyFile(
      file,
      REPORTS
    )
  ) {

    console.log(
      "COPIED:",
      file
    );

    copiedReports++;
  }
}

console.log("");

console.log(
  "Reports copied:",
  `${copiedReports}/${reportFiles.length}`
);

console.log("");

/*
==================================================
ARCHIVE OLD ANALYSIS FILES
==================================================

Everything beginning with old V-series analysis
names is moved to archive/.

Product files are explicitly protected.
==================================================
*/

const protectedFiles = new Set([
  ...keepRoot,
  ...evidenceFiles,
  ...reportFiles,
  "cleanup-v1.js",
]);

const allFiles =
  fs.readdirSync(ROOT)
    .filter(file => {

      const fullPath =
        path.join(ROOT, file);

      return (
        fs.statSync(fullPath).isFile()
      );
    });

const archiveCandidates =
  allFiles.filter(file => {

    if (protectedFiles.has(file)) {
      return false;
    }

    /*
    Old agent analysis JSON / JS / TXT / MD
    */
    return (
      /^agent-.*-v\d+/i.test(file) ||
      /^agent-.*-v\d+-\d+/i.test(file) ||
      /^FINAL-REPORT-v\d+/i.test(file) ||
      /^FINAL-TRUST-ASSESSMENT-v\d+/i.test(file)
    );
  });

console.log("==========================================");
console.log(" ARCHIVE");
console.log("==========================================");
console.log("");

let archived = 0;

for (const file of archiveCandidates) {

  const destination =
    path.join(
      ARCHIVE,
      file
    );

  if (
    fs.existsSync(destination)
  ) {

    console.log(
      "SKIP (already archived):",
      file
    );

    continue;
  }

  try {

    fs.renameSync(
      path.join(ROOT, file),
      destination
    );

    console.log(
      "MOVED:",
      file
    );

    archived++;

  } catch (error) {

    console.log(
      "FAILED:",
      file
    );

    console.log(
      error.message
    );
  }
}

console.log("");

/*
==================================================
FINAL DIRECTORY CHECK
==================================================
*/

console.log("==========================================");
console.log(" CLEANUP SUMMARY");
console.log("==========================================");
console.log("");

console.log(
  "Evidence copied:",
  copiedEvidence
);

console.log(
  "Reports copied:",
  copiedReports
);

console.log(
  "Old files archived:",
  archived
);

console.log("");

console.log("Protected product files:");

for (const file of keepRoot) {

  if (
    fs.existsSync(
      path.join(ROOT, file)
    )
  ) {

    console.log(
      "  ✓",
      file
    );

  } else {

    console.log(
      "  ! MISSING:",
      file
    );
  }
}

console.log("");

console.log("==========================================");
console.log(" CLEANUP COMPLETED");
console.log("==========================================");
console.log("");

console.log(
  "IMPORTANT:"
);

console.log(
  "No file was permanently deleted."
);

console.log(
  "Evidence was copied to evidence/."
);

console.log(
  "Reports were copied to reports/."
);

console.log(
  "Old analysis files were moved to archive/."
);

console.log("");

console.log(
  "You can now inspect the folders before any deletion."
);

console.log("");