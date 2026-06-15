"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var js_yaml_1 = require("js-yaml");
var pg_1 = require("pg");
var crypto_1 = require("crypto");
var dotenv_1 = require("dotenv");
var url_1 = require("url");
var path_1 = require("path");
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = (0, path_1.dirname)(__filename);
dotenv_1.default.config({ path: (0, path_1.join)(__dirname, '../.env') });
var connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable not set');
    process.exit(1);
}
var pool = new pg_1.Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false },
});
function outputsMappingForModule(module) {
    if (module.includes('linux-ec2') || module.includes('docker-ec2')) {
        return { EC2_IP: 'ec2_private_ip', INSTANCE_ID: 'ec2_instance_id' };
    }
    if (module.includes('kubernetes-eks')) {
        return { CLUSTER_ENDPOINT: 'cluster_endpoint', CLUSTER_NAME: 'cluster_name' };
    }
    return { EC2_IP: 'ec2_private_ip' };
}
function parseYaml(yamlPath) {
    var fileContent = (0, fs_1.readFileSync)(yamlPath, 'utf8');
    var parsed = js_yaml_1.default.load(fileContent);
    if (!Array.isArray(parsed)) {
        throw new Error('Expected YAML root to be an array of lab definitions');
    }
    return parsed.filter(function (lab) { return lab && lab.id && lab.title; });
}
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        var yamlPath, parsed, client, _i, parsed_1, lab, id, content, outputsMapping, checkCount, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    yamlPath = (0, path_1.join)(__dirname, '../../labdefinations.yaml');
                    console.log("Reading lab definitions from: ".concat(yamlPath));
                    parsed = parseYaml(yamlPath);
                    console.log("Parsed ".concat(parsed.length, " labs from YAML\n"));
                    if (parsed.length === 0) {
                        console.error('No labs parsed — check the YAML file format.');
                        process.exit(1);
                    }
                    return [4 /*yield*/, pool.connect()];
                case 1:
                    client = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 12, 14, 16]);
                    return [4 /*yield*/, client.query('BEGIN')];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, client.query('DELETE FROM validation_runs')];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, client.query('DELETE FROM lab_sessions')];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, client.query('DELETE FROM lab_definitions')];
                case 6:
                    _a.sent();
                    _i = 0, parsed_1 = parsed;
                    _a.label = 7;
                case 7:
                    if (!(_i < parsed_1.length)) return [3 /*break*/, 10];
                    lab = parsed_1[_i];
                    id = (0, crypto_1.randomUUID)();
                    content = {
                        objectives: lab.objectives || [],
                        situation: lab.situation || '',
                        success_condition: lab.success_condition || '',
                        hint_policy: lab.hint_policy || 'show_level_1_automatically',
                        hints: lab.hints || [],
                        validation: lab.validation || [],
                    };
                    outputsMapping = outputsMappingForModule(lab.terraform_module);
                    return [4 /*yield*/, client.query("INSERT INTO lab_definitions (\n          id, slug, title, description, difficulty, terraform_module, scenario_id,\n          estimated_minutes, timeout_minutes, published, outputs_mapping, content,\n          created_at, updated_at\n        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())", [
                            id,
                            lab.id,
                            lab.title,
                            lab.description || null,
                            lab.difficulty,
                            lab.terraform_module,
                            lab.scenario_id || null,
                            lab.estimated_minutes || 60,
                            lab.timeout_minutes || 120,
                            true,
                            JSON.stringify(outputsMapping),
                            JSON.stringify(content),
                        ])];
                case 8:
                    _a.sent();
                    checkCount = (lab.validation || []).length;
                    console.log("  \u2713 ".concat(lab.id, " (").concat(lab.difficulty, ", ").concat(checkCount, " checks, scenario: ").concat(lab.scenario_id || 'none', ")"));
                    _a.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 7];
                case 10: return [4 /*yield*/, client.query('COMMIT')];
                case 11:
                    _a.sent();
                    console.log("\n\u2713 Seeded ".concat(parsed.length, " labs successfully"));
                    return [3 /*break*/, 16];
                case 12:
                    error_1 = _a.sent();
                    return [4 /*yield*/, client.query('ROLLBACK')];
                case 13:
                    _a.sent();
                    console.error('Seed failed:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 16];
                case 14:
                    client.release();
                    return [4 /*yield*/, pool.end()];
                case 15:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 16: return [2 /*return*/];
            }
        });
    });
}
seed().catch(function (err) {
    console.error('Fatal:', err);
    process.exit(1);
});
