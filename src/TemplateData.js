const fs = require("fs-extra");
const globby = require("globby");
const parsePath = require("parse-filepath");
const TemplateRender = require("./TemplateRender");
const TemplateConfig = require("./TemplateConfig");
const TemplatePath = require("./TemplatePath");

let templateCfg = new TemplateConfig(require("../config.json"));
let cfg = templateCfg.getConfig();

function TemplateData(globalDataPath) {
  this.globalDataPath = globalDataPath;

  this.rawImports = {};
  this.rawImports[cfg.keys.package] = this.getJsonRaw(
    TemplatePath.localPath("package.json")
  );

  this.globalData = null;
}

TemplateData.prototype.clearData = function() {
  this.globalData = null;
};

TemplateData.prototype.cacheData = async function() {
  this.clearData();

  return this.getData();
};

TemplateData.prototype.getAllGlobalData = async function() {
  return this.getJson(this.globalDataPath, this.rawImports);
};

TemplateData.prototype.getData = async function() {
  if (!this.globalData) {
    let globalJson = {};

    if (this.globalDataPath) {
      globalJson = await this.getAllGlobalData();
    }

    this.globalData = Object.assign({}, globalJson, this.rawImports);
  }

  return this.globalData;
};

TemplateData.prototype.getLocalData = async function(localDataPath) {
  let localFilename = parsePath(localDataPath).name;
  let importedData = {};
  importedData[localFilename] = await this.getJson(
    localDataPath,
    this.rawImports
  );

  let globalData = await this.getData();

  return Object.assign({}, globalData, importedData);
};

TemplateData.prototype._getLocalJson = function(path) {
  // todo convert to readFile with await (and promisify?)
  let rawInput;
  try {
    rawInput = fs.readFileSync(path, "utf-8");
  } catch (e) {
    // if file does not exist, return empty obj
    return "{}";
  }

  return rawInput;
};

TemplateData.prototype.getJsonRaw = function(path) {
  return JSON.parse(this._getLocalJson(path));
};

TemplateData.prototype.getJson = async function(path, rawImports) {
  let rawInput = this._getLocalJson(path);
  let fn = await new TemplateRender(
    cfg.jsonDataTemplateEngine
  ).getCompiledTemplate(rawInput);

  // pass in rawImports, don’t pass in global data, that’s what we’re parsing
  let str = await fn(rawImports);
  return JSON.parse(str);
};

module.exports = TemplateData;