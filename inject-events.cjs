const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');
const isReactComponent = require('./isReactComponent.js');
const { createIterateUtilFile } = require('./createIterateUtil.js');
const addWrapper = require('./addWrapper.js');
const axios = require('axios');
const { randomUUID } = require('crypto');

class FileProcessor {
  constructor(filePath) {
    this.filePath = filePath;
    this.isMixpanelTrackerInFile = false;
    this.wrapperArray = [];
    this.components = [];
    // this.events = [];

    try {
      this.code = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      throw error;
    }

    try {
      this.ast = parser.parse(this.code, {
        sourceType: 'unambiguous',
        plugins: ['jsx', 'typescript'],
      });
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error);
      throw error;
    }
  }

  getComponentName(path) {
    const name = path.node.name;
    if (name?.type === 'JSXIdentifier') {
      const tagName = name.name;
      return tagName;
    }
  }

  // async pushEvents() {
  //   if (this.events.length > 0) {
  //     try {
  //       const modifiedEvents = this.events.map((event) => {
  //         if (Object.keys(event.attributes).length === 0) {
  //           return { ...event, attributes: null, is_manual: true }; // todo platforms / element_uid / deployment_id
  //         }
  //         return event;
  //       });
  //       // todo remove hardcoded platform, element_uid, deployment_id
  //       const response = await axios.post('http://localhost:4000/pushevents', {
  //         events: modifiedEvents,
  //         filePath: this.filePath,
  //         platform: 'MIXPANEL',
  //         deployment_id: 'testid1234',
  //       });
  //       console.log(
  //         `Events pushed successfully for ${this.filePath}:`,
  //         response.data
  //       );
  //     } catch (error) {
  //       console.error(`Error pushing events for ${this.filePath}:`, error);
  //     }
  //   }
  // }

  // async sendDataIterateObjects() {
  //   if (this.wrapperArray.length === 0) {
  //     console.log(`No dataiterate objects to send for ${this.filePath}`);
  //     return;
  //   }
  //   try {
  //     const response = await axios.post('http://localhost:4000/pushevents', {
  //       elements: this.wrapperArray.map((wrapper) => wrapper.dataiterate),
  //       // filePath: this.filePath,
  //       is_manual: false,
  //       deployment_id: 'f23r43fefg54',
  //       platforms: 'MIXPANEL',
  //     });
  //     console.log(
  //       `Dataiterate objects pushed successfully for ${this.filePath}:`,
  //       response.data
  //     );
  //   } catch (error) {
  //     console.error(
  //       `Error pushing dataiterate objects for ${this.filePath}:`,
  //       error
  //     );
  //   }
  // }

  async processFile() {
    try {
      this.traverseAST();
      this.wrapperArray.forEach(
        ({ originalName, wrapperName, dataiterate }) => {
          addWrapper(
            this.ast,
            originalName,
            wrapperName,
            btoa(JSON.stringify(dataiterate))
          );
        }
      );
      const { code: modifiedCode } = generate(this.ast, {}, this.code);
      fs.writeFileSync(this.filePath, modifiedCode);
      console.log(`Processed: ${this.filePath}`);

      // await this.pushEvents();
      // await this.sendDataIterateObjects();
    } catch (error) {
      console.error(`Error processing file ${this.filePath}:`, error);
    }
  }

  traverseAST() {
    const visitor = {
      CallExpression: (path) => {
        if (
          path.node?.callee?.object?.name === 'mixpanel' &&
          path.node?.callee?.property?.name === 'track'
        ) {
          this.isMixpanelTrackerInFile = true;
          const eventName = path.node.arguments[0].value;
          let eventAttributes = path.node.arguments[1];
          if (eventAttributes?.type === 'ObjectExpression') {
            eventAttributes = eventAttributes.properties.reduce((acc, prop) => {
              acc[prop.key.name] =
                prop.value.value || prop.value.name || prop.value.type;
              return acc;
            }, {});
          } else {
            eventAttributes = {};
          }

          // this.events.push({ name: eventName, attributes: eventAttributes });

          let jsxOpeningElement = path?.parentPath;
          while (
            jsxOpeningElement &&
            jsxOpeningElement?.node?.type !== 'JSXOpeningElement'
          ) {
            jsxOpeningElement = jsxOpeningElement?.parentPath;
          }

          if (jsxOpeningElement && jsxOpeningElement.node) {
            const isComponent = isReactComponent(jsxOpeningElement);
            const existingComponent = this.components.find(
              (component) =>
                component.jsxOpeningElement.node.name.name ===
                  jsxOpeningElement.node.name.name &&
                JSON.stringify(component.eventAttributes) ===
                  JSON.stringify(eventAttributes)
            );

            if (!existingComponent) {
              this.components.push({
                jsxOpeningElement,
                eventName,
                eventAttributes,
                isComponent,
              });
            }
          }
        }
      },
    };

    try {
      traverse(this.ast, visitor);
      this.isMixpanelTrackerInFile &&
        this.components.forEach(
          async ({
            jsxOpeningElement,
            eventName,
            eventAttributes,
            isComponent,
          }) => {
            const attributes = jsxOpeningElement.node.attributes;
            let iterateEvents = [];
            const existingEventAttr = attributes.find(
              (attr) => attr.name.name === 'injected_events'
            );

            if (existingEventAttr) {
              iterateEvents = JSON.parse(atob(existingEventAttr.value.value));
              attributes.splice(attributes.indexOf(existingEventAttr), 1);
            }

            iterateEvents.push({
              name: eventName,
              attributes: eventAttributes,
            });

            const dataIterateEvents = types.jsxAttribute(
              types.jsxIdentifier('injected_events'),
              types.stringLiteral(btoa(JSON.stringify(iterateEvents)))
            );

            if (isComponent) {
              const componentName = this.getComponentName(jsxOpeningElement);
              traverse(this.ast, {
                JSXIdentifier(path) {
                  if (path.node.name === componentName) {
                    path.node.name = `Iterate${componentName}`;
                  }
                },
              });

              const uuid = randomUUID();
              let dataiterate = {
                events: [iterateEvents],
                filePath: this.filePath,
                id: uuid,
              };

              let wrapper = {
                originalName: componentName,
                wrapperName: `Iterate${componentName}`,
                dataiterate,
              };

              this.wrapperArray.push(wrapper);
              try {
                const response = await axios.post(
                  'http://localhost:4000/pushevents',
                  {
                    dataiterate,
                    is_manual: false,
                    deployment_id: 'f23r43fefg54',
                    platforms: 'MIXPANEL',
                  }
                );
                console.log(
                  `Dataiterate object pushed successfully for ${this.filePath}:`,
                  response.data
                );
              } catch (error) {
                console.error(
                  `Error pushing dataiterate object for ${this.filePath}:`,
                  error
                );
              }
            } else {
              attributes.push(dataIterateEvents);
            }
          }
        );
    } catch (error) {
      console.error(`Error traversing AST in file ${this.filePath}:`, error);
      throw error;
    }
  }
}

class DirectoryTraverser {
  constructor(dir, projectType) {
    this.dir = dir;
    this.projectType = projectType;
  }

  setProjectType(ext) {
    if (!this.projectType && (ext === '.jsx' || ext === '.tsx')) {
      this.projectType = ext;
      console.log(`Project type set to: ${this.projectType}`);
    }
  }

  async traverseDirectory(dir = this.dir) {
    let files;
    try {
      files = fs.readdirSync(dir);
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
      return;
    }

    for (const file of files) {
      if (file === 'node_modules') continue;
      const filePath = path.join(dir, file);
      try {
        if (fs.statSync(filePath).isDirectory()) {
          await this.traverseDirectory(filePath);
        } else if (
          path.extname(filePath) === '.jsx' ||
          path.extname(filePath) === '.tsx'
        ) {
          this.setProjectType(path.extname(filePath));
          await this.processFile(filePath);
        }
      } catch (error) {
        console.error(`Error processing file or directory ${filePath}:`, error);
      }
    }
  }

  async processFile(filePath) {
    try {
      const fileProcessor = new FileProcessor(filePath);
      await fileProcessor.processFile();
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }
}

class Project {
  constructor(sourceCodeDir, outputCodeDir) {
    this.sourceCodeDir = sourceCodeDir;
    this.outputCodeDir = outputCodeDir;
    this.projectType = null;

    try {
      if (!fs.existsSync(outputCodeDir)) {
        fs.mkdirSync(outputCodeDir, { recursive: true });
      }
    } catch (error) {
      console.error(`Error creating output directory ${outputCodeDir}:`, error);
      throw error;
    }
  }

  async processDirectory() {
    try {
      const directoryTraverser = new DirectoryTraverser(
        this.sourceCodeDir,
        this.projectType
      );
      await directoryTraverser.traverseDirectory();
      this.projectType = directoryTraverser.projectType;
    } catch (error) {
      console.error(`Error processing directory ${this.sourceCodeDir}:`, error);
    }
  }
}

async function main() {
  try {
    const project = new Project('../flux', '../flux');
    await project.processDirectory();
    createIterateUtilFile(project.sourceCodeDir, project.projectType);
  } catch (error) {
    console.error('Error initializing or processing the project:', error);
  }
}

main();
