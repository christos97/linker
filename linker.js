const child = require("child_process");
const util = require("util");
const cluster = require("cluster");
const os = require("os");
const path = require("path");

const Types = require("./types");
// const { removeNodeModulesRobocopy } = require("./utils.js");

const { packages, dependencies, options } = require("./config.json");

const execAsync = util.promisify(child.exec);

const IS_WINDOWS = process.platform.includes("win");
const PROCESS_OK = "PROCESS_OK";
const initialCommands = ["rm -rf node_modules", "yarn install"];

if (options.removeLockfile) {
  initialCommands.unshift("rm -f *lock");
}
if (options.unlink) {
  initialCommands.unshift("yarn unlink");
}

/**
 * @param {Types.Project} project
 * @param {string} command
 */
async function executeCommand(project, command) {
  console.log(`[${command}] ==> [${project.name}]`);
  const dir = path.join(process.cwd(), project.dir);

  try {
    await execAsync(`cd ${dir} && ${command}`);
  } catch (error) {
    console.error(
      `Error in project ${project.name} during ${command}: ${
        error.message || error
      }`
    );
    throw error;
  }
}

/**
 * @param {Types.Project} project
 */
async function runCommandsForProject(project) {
  // execute initial commands
  for (let initCmd of initialCommands) await executeCommand(project, initCmd);

  // create project symlink
  await executeCommand(project, "yarn link");

  const projectDependencies = dependencies[project.name] || [];
  const links = projectDependencies.map((dependency) => `yarn link "${dependency}"`); // prettier-ignore

  for (let link of links) await executeCommand(project, link);
}

/**
 * @description Forks a new process for each package and links it to external dependencies
 */
if (cluster.isMaster) {
  const numWorkers = Math.min(packages.length, os.cpus().length);
  let completedWorkers = 0;

  for (let i = 0; i < numWorkers; i++) {
    const worker = cluster.fork();
    worker.send(packages[i]);
    worker.on("message", (msg) => {
      if (msg === PROCESS_OK) {
        completedWorkers++;
        if (completedWorkers === numWorkers) {
          console.log("\nAll workers completed.");
          process.exit(0);
        }
      }
    });
  }
} else {
  process.on("message", async (project) => {
    try {
      await runCommandsForProject(project);
      process.send(PROCESS_OK);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
}
