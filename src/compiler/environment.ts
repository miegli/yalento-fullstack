import {swaggerTemplate} from '../templates/swagger';

const fs = require('fs');
const path = require('path');
const beautify = require('js-beautify').js;
const https = require('https');
import * as childProcess from 'child_process';


export interface Config {
  production: boolean;
  apiHost: string;
  apiBaseUrl: string;
  firebase: {
    apiKey?: string,
    authDomain?: string,
    databaseURL?: string,
    projectId: string,
    storageBucket?: string,
    messagingSenderId?: string,
    appId?: string,
    measurementId?: string,
    host?: string,
    region?: string,
    ssl?: boolean
  };
  __functionsTsConfigPath: string;
  __angularTsConfigPath: string;
  __angularDistPath: string;
  __angularPackageJsonPath: string;
  __generatedCodePath: string;
  __swaggerPath: string;
  __swaggerPathGenerated: string;
  __codeGenPath: string;
  __codeGenCommandApi: string;
  __codeGenCommandJest: string;
  __codeGenForkPath: string;
  __jsonSchemaPath: string;
  __firebaseRcPath: string;
  __firebasePath: string;
}


export class Environment {

  private config: Config = {} as Config;
  private readonly SWAGGER_CODEGEN_SOURCEURL = 'https://repo1.maven.org/maven2/io/swagger/swagger-codegen-cli/2.4.14/swagger-codegen-cli-2.4.14.jar';
  private readonly SWAGGER_CODEGEN_VERSION = '2.4.14';

  constructor() {

  }

  async getConfig(isTestingMode: boolean): Promise<Config> {
    this.config = this.generateConfig(isTestingMode);
    this.updateAngularPackageJson();
    this.createSwaggerYamlIfEmpty();
    await this.installSwaggerCodeGen().finally();
    return this.config;
  }

  private installSwaggerCodeGen() {

    return new Promise((resolve, reject) => {

      const outDirJest = `${this.config.__generatedCodePath}${path.sep}test`;
      const outDirApi = `${this.config.__generatedCodePath}${path.sep}api`;

      if (!fs.existsSync(outDirJest)) {
        fs.mkdirSync(outDirJest, {recursive: true});
      }

      if (!fs.existsSync(outDirApi)) {
        fs.mkdirSync(outDirApi, {recursive: true});
      }

      if (fs.existsSync(this.config.__swaggerPathGenerated)) {
        fs.unlinkSync(this.config.__swaggerPathGenerated);
      }
      this.config.__swaggerPathGenerated = this.getProjectRoot('node_modules', 'yalento-fullstack', 'lib', 'bin', 'swagger.json');
      childProcess.execSync(
        `${this.getProjectRoot('node_modules', '@apidevtools', 'swagger-cli', 'bin', 'swagger-cli.js')} bundle ${this.config.__swaggerPath} -o ${this.config.__swaggerPathGenerated}`
      );

      const swagger = require(this.config.__swaggerPathGenerated);
      swagger.host = this.config.apiHost;
      swagger.basePath = this.config.apiBaseUrl + swagger.basePath;
      fs.writeFileSync(this.config.__swaggerPathGenerated, JSON.stringify(swagger));
      /* tslint:disable */
      this.config.__codeGenCommandJest = `java -jar ${this.config.__codeGenPath} generate -i ${this.config.__swaggerPathGenerated} -l typescript-fetch -o ${outDirJest} -t ${this.config.__generatedCodePath}${path.sep}templates${path.sep}codegen-jest`;
      this.config.__codeGenCommandApi = `java -jar ${this.config.__codeGenPath} generate -i ${this.config.__swaggerPathGenerated} -l typescript-fetch -o ${outDirApi} -t ${this.config.__generatedCodePath}${path.sep}templates${path.sep}codegen-api`;
      this.generateChildProcessCodeGenForks(outDirJest, outDirApi, swagger);

      let versionCheck = true;

      if (!fs.existsSync(path.dirname(this.config.__codeGenPath))) {
        fs.mkdirSync(path.dirname(this.config.__codeGenPath), {recursive: true});
      }

      if (fs.existsSync(this.config.__codeGenPath)) {
        versionCheck = this.SWAGGER_CODEGEN_VERSION === childProcess.execSync(`java -jar ${this.config.__codeGenPath} version`).toString().trim();
      }

      if (!fs.existsSync(this.config.__codeGenPath) || !versionCheck) {
        const file = fs.createWriteStream(this.config.__codeGenPath);
        const {pipeline} = require('stream');
        https.get(this.SWAGGER_CODEGEN_SOURCEURL, response => {
          pipeline(
            response,
            file,
            err => {
              if (!err) {
                resolve();
              } else {
                reject(err);
              }
            }
          );
        });
      } else {
        resolve();
      }
    });

  }

  private generateChildProcessCodeGenForks(outDirJest: string, outDirApi: string, swagger: any) {
    this.config.__jsonSchemaPath = `${outDirApi}${path.sep}json-schema${path.sep}`;
    this.config.__codeGenForkPath = this.getProjectRoot('node_modules', 'yalento-fullstack', 'lib', 'bin', 'codeGenFork.js');
    let source = `const fs = require('fs');
    const childProcess = require('child_process');
    childProcess.execSync('${this.config.__codeGenCommandApi}', {stdio : 'pipe'});
    childProcess.execSync('${this.config.__codeGenCommandJest}', {stdio : 'pipe'});
    childProcess.execSync('node ${this.getProjectRoot('node_modules', 'ts-interface-builder', 'bin', 'ts-interface-builder')} ${outDirJest}${path.sep}api.ts -o ${outDirApi}', {stdio : 'pipe'});
    let stdout;
    let data;
    `;

    if (!fs.existsSync(this.config.__jsonSchemaPath)) {
      fs.mkdirSync(this.config.__jsonSchemaPath, {recursive: true});
    }

    if (!fs.existsSync(this.config.__jsonSchemaPath + path.sep + 'models')) {
      fs.mkdirSync(this.config.__jsonSchemaPath + path.sep + 'models', {recursive: true});
    }


    Object.keys(swagger.definitions).forEach((model) => {
      source += `
      stdout = childProcess.execSync(
        '${this.getProjectRoot('node_modules', 'typescript-json-schema', 'bin', 'typescript-json-schema')} --required ${outDirApi}${path.sep}api.ts ${model}'
      );
      data = 'export const ${model.trim()} = ' + stdout.toString() + ';';
      fs.writeFileSync(
        '${this.config.__jsonSchemaPath}models${path.sep}${model.toLowerCase()}.ts',
        data
      );
      `;
    });


    if (swagger.definitions) {
      let indexData = '';
      let dataTypeStringEnum = '';
      Object.keys(swagger.definitions).forEach((model, i) => {
        if (i > 0) {
          dataTypeStringEnum += ' | ';
        }
        indexData += `export * from './${model.toLowerCase()}'` + '\n';
        dataTypeStringEnum += `'${model}' | 'Array<${model}>'`;
      });
      source += `fs.writeFileSync(\`${this.config.__jsonSchemaPath}models${path.sep}index.ts\`, \`${indexData}\`);`;


      const validatorCode = `import * as schema from './models';
import * as Ajv from 'ajv';
import {ErrorObject} from "ajv";

type IDataType = ${dataTypeStringEnum};

/**
 * @return {Boolean} validation result. Errors from the last validation will be available in ajv.errors
 * @param dataType
 * @param data
 */
export function isInvalide(dataType: IDataType, data: any): boolean | Array<ErrorObject> {
  const ajv = Ajv({allErrors: true});
  let valid: any;

  try {
    valid = ajv.validate(schema[dataType], data);
  } catch (e) {
  }

  if (valid) {
    return false;
  }

  return ajv.errors;

}
`;

      source += `fs.writeFileSync(\`${this.config.__jsonSchemaPath}index.ts\`, \`${validatorCode}\`);`;

    }

    const indexApiCode = `export * from '.${path.sep}api${path.sep}json-schema/index';
    export * from '.${path.sep}api/api';`;

    source += `fs.writeFileSync(\`${this.config.__generatedCodePath}${path.sep}index.d.ts\`, \`${indexApiCode}\`);`;


    fs.writeFileSync(this.config.__codeGenForkPath, source);


  }

  private createSwaggerYamlIfEmpty() {
    if (!fs.existsSync(this.config.__swaggerPath) || fs.readFileSync(this.config.__swaggerPath).toString().length < 1) {
      fs.writeFileSync(this.config.__swaggerPath, swaggerTemplate);
    }
  }

  private updateAngularPackageJson() {
    const packageJson = require(this.config.__angularPackageJsonPath);
    packageJson.scripts['swagger:edit'] = 'cd node_modules/yalento-fullstack && npm run swagger:edit';
    packageJson.scripts['yalento'] = 'node ./node_modules/yalento-fullstack/lib/compiler/yalento-fullstack compile --watch';

    fs.writeFileSync(this.config.__angularPackageJsonPath, beautify(JSON.stringify(packageJson)));
  }

  private generateConfig(isTestingMode: boolean): Config {
    const firebaseRc = this.getFirebaseRc();
    const firebase = this.getFirebase();
    const angular = this.getAngular();
    const isProduction = !isTestingMode && process.env['FIREBASE_TOKEN_CI'] !== undefined;
    const projectId = process.env.FIREBASE_PROJECT_ID || firebaseRc.projects.default;
    const region = isTestingMode || !process.env.FIREBASE_REGION ? 'us-central1' : process.env.FIREBASE_REGION;

    return {
      __jsonSchemaPath: '',
      __swaggerPathGenerated: '',
      __codeGenForkPath: '',
      __codeGenCommandApi: '',
      __codeGenCommandJest: '',
      __firebaseRcPath: this.getProjectRoot('.firebaserc'),
      __firebasePath: this.getProjectRoot('firebase.json'),
      __codeGenPath: this.getProjectRoot('node_modules', 'yalento-fullstack', 'lib', 'bin', 'codegen'),
      __angularPackageJsonPath: this.getProjectRoot('package.json'),
      __swaggerPath: this.getProjectRoot('swagger.yaml'),
      __generatedCodePath: this.getProjectRoot('node_modules', 'yalento-fullstack', 'lib'),
      __angularDistPath: angular.projects[angular.defaultProject].architect.build.options
        .outputPath,
      __angularTsConfigPath: this.getProjectRoot('tsconfig.json'),
      __functionsTsConfigPath: this.getProjectRoot('functions', 'tsconfig.json'),
      apiHost: process.env.API_HOST || (isProduction ? `${region}-${projectId}.cloudfunctions.net` : `localhost:${firebase.emulators.functions.port}`),
      apiBaseUrl: process.env.PI_BASEU_URL || (isProduction ? '' : `/${projectId}/${region}`),
      production: isProduction,
      firebase: {
        projectId: projectId,
        ssl: !(isTestingMode || !isProduction),
        region: region,
        host: isTestingMode || !isProduction ? `localhost:${firebase.emulators.firestore.port}` : undefined
      }
    }

  }

  private getAngular(): any {
    return JSON.parse(fs.readFileSync(this.getProjectRoot('angular.json')).toString());
  }

  private getFirebase(): any {
    return JSON.parse(fs.readFileSync(this.getProjectRoot('firebase.json')).toString());
  }

  private getFirebaseRc(): any {

    return JSON.parse(fs.readFileSync(this.getProjectRoot('.firebaserc')).toString());
  }

  private getProjectRoot(...pathOrFileName): string {
    return `${__dirname}${path.sep}..${path.sep}..${path.sep}..${path.sep}..${path.sep}${pathOrFileName.join(path.sep)}`;
  }

}
