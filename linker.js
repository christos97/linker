const child = require("child_process");
const util = require("util");
const cluster = require("cluster");
const os = require("os");
const path = require("path");

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

const removeNodeModulesRobocopy = () => {
  return new Promise((resolve, reject) => {
    child.exec("mkdir emptydir", (error) => {
      if (error) {
        reject(`Error creating emptydir: ${error}`);
        return;
      }

      child.exec(
        `robocopy emptydir ${path.join(dir, "node_modules")} /mir`,
        (error) => {
          if (error && error.code !== 1) {
            reject(`Error during robocopy: ${error}`);
            return;
          }

          child.exec("rmdir emptydir", (error) => {
            if (error) {
              reject(`Error removing emptydir: ${error}`);
              return;
            }

            console.log(
              `node_modules in ${project.name} deleted successfully!`
            );
            resolve();
          });
        }
      );
    });
  });
};

/**
 * @param {Project} project
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
 * @param {Project} project
 */
async function runCommandsForProject(project) {
  // execute initial commands
  for (let initCmd of initialCommands) {
    await executeCommand(project, initCmd);
  }

  // create project symlink
  await executeCommand(project, "yarn link");

  const projectDependencies = dependencies[project.name] || [];
  const links = projectDependencies.map((dependency) => `yarn link "${dependency}"`); // prettier-ignore

  for await (let link of links) {
    executeCommand(project, link);
  }
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
