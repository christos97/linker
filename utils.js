const child = require("child_process");
const path = require("path");

const Types = require("./types");

/**
 * Deletes node_modules in project directory using robocopy.
 * @param {Types.Project} project
 */
const removeNodeModulesRobocopy = (project) => {
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

module.exports = {
  removeNodeModulesRobocopy,
};
