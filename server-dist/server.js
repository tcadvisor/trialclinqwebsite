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
var express_1 = require("express");
var path_1 = require("path");
var url_1 = require("url");
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
var app = (0, express_1.default)();
app.use(express_1.default.json());
// EPIC token exchange endpoint
app.post("/api/epic/token-exchange", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, code, code_verifier, clientId, fhirUrl, redirectUri, wellKnownUrl, configResponse, configError, config, tokenEndpoint, tokenBody, tokenResponse, errorText, tokens, patientData, patientRes, patient, _b, allergiesRes, medicationsRes, conditionsRes, _c, _d, _e, err_1, error_1, message;
    var _f;
    var _g, _h;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0:
                _j.trys.push([0, 25, , 26]);
                _a = req.body, code = _a.code, code_verifier = _a.code_verifier;
                if (!code) {
                    return [2 /*return*/, res.status(400).json({ error: "Missing authorization code" })];
                }
                clientId = process.env.VITE_EPIC_CLIENT_ID;
                fhirUrl = process.env.VITE_EPIC_FHIR_URL;
                redirectUri = process.env.VITE_EPIC_REDIRECT_URI;
                if (!clientId || !fhirUrl || !redirectUri) {
                    console.error("Missing EPIC configuration:", { clientId: !!clientId, fhirUrl: !!fhirUrl, redirectUri: !!redirectUri });
                    return [2 /*return*/, res.status(500).json({ error: "Missing EPIC configuration" })];
                }
                wellKnownUrl = "".concat(fhirUrl, ".well-known/smart-configuration");
                console.log("Fetching EPIC config from:", wellKnownUrl);
                return [4 /*yield*/, fetch(wellKnownUrl)];
            case 1:
                configResponse = _j.sent();
                if (!!configResponse.ok) return [3 /*break*/, 3];
                return [4 /*yield*/, configResponse.text()];
            case 2:
                configError = _j.sent();
                console.error("EPIC config error:", configResponse.status, configError);
                throw new Error("Failed to fetch EPIC well-known config: ".concat(configResponse.status));
            case 3: return [4 /*yield*/, configResponse.json()];
            case 4:
                config = _j.sent();
                tokenEndpoint = config.token_endpoint;
                if (!tokenEndpoint) {
                    throw new Error("No token_endpoint in EPIC SMART configuration");
                }
                console.log("Token endpoint:", tokenEndpoint);
                tokenBody = new URLSearchParams({
                    grant_type: "authorization_code",
                    code: code,
                    client_id: clientId,
                    redirect_uri: redirectUri,
                    code_verifier: code_verifier || "",
                });
                console.log("Exchanging code for token...");
                return [4 /*yield*/, fetch(tokenEndpoint, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: tokenBody.toString(),
                    })];
            case 5:
                tokenResponse = _j.sent();
                if (!!tokenResponse.ok) return [3 /*break*/, 7];
                return [4 /*yield*/, tokenResponse.text()];
            case 6:
                errorText = _j.sent();
                console.error("Token exchange failed:", tokenResponse.status, errorText);
                throw new Error("Token exchange failed: ".concat(tokenResponse.status, " - ").concat(errorText));
            case 7: return [4 /*yield*/, tokenResponse.json()];
            case 8:
                tokens = _j.sent();
                patientData = null;
                if (!tokens.patient) return [3 /*break*/, 24];
                _j.label = 9;
            case 9:
                _j.trys.push([9, 23, , 24]);
                console.log("Fetching patient data for:", tokens.patient);
                return [4 /*yield*/, fetch("".concat(fhirUrl, "Patient/").concat(tokens.patient), {
                        headers: {
                            Authorization: "Bearer ".concat(tokens.access_token),
                        },
                    })];
            case 10:
                patientRes = _j.sent();
                if (!patientRes.ok) return [3 /*break*/, 22];
                return [4 /*yield*/, patientRes.json()];
            case 11:
                patient = _j.sent();
                return [4 /*yield*/, Promise.all([
                        fetch("".concat(fhirUrl, "AllergyIntolerance?patient=").concat(tokens.patient), {
                            headers: { Authorization: "Bearer ".concat(tokens.access_token) },
                        }),
                        fetch("".concat(fhirUrl, "MedicationRequest?patient=").concat(tokens.patient), {
                            headers: { Authorization: "Bearer ".concat(tokens.access_token) },
                        }),
                        fetch("".concat(fhirUrl, "Condition?patient=").concat(tokens.patient), {
                            headers: { Authorization: "Bearer ".concat(tokens.access_token) },
                        }),
                    ])];
            case 12:
                _b = _j.sent(), allergiesRes = _b[0], medicationsRes = _b[1], conditionsRes = _b[2];
                _f = {
                    id: patient.id,
                    name: (_h = (_g = patient.name) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.text,
                    birthDate: patient.birthDate,
                    gender: patient.gender
                };
                if (!allergiesRes.ok) return [3 /*break*/, 14];
                return [4 /*yield*/, allergiesRes.json()];
            case 13:
                _c = _j.sent();
                return [3 /*break*/, 15];
            case 14:
                _c = { entry: [] };
                _j.label = 15;
            case 15:
                _f.allergies = _c;
                if (!medicationsRes.ok) return [3 /*break*/, 17];
                return [4 /*yield*/, medicationsRes.json()];
            case 16:
                _d = _j.sent();
                return [3 /*break*/, 18];
            case 17:
                _d = { entry: [] };
                _j.label = 18;
            case 18:
                _f.medications = _d;
                if (!conditionsRes.ok) return [3 /*break*/, 20];
                return [4 /*yield*/, conditionsRes.json()];
            case 19:
                _e = _j.sent();
                return [3 /*break*/, 21];
            case 20:
                _e = { entry: [] };
                _j.label = 21;
            case 21:
                patientData = (_f.conditions = _e,
                    _f);
                _j.label = 22;
            case 22: return [3 /*break*/, 24];
            case 23:
                err_1 = _j.sent();
                console.error("Error fetching patient data:", err_1);
                return [3 /*break*/, 24];
            case 24: 
            // Return tokens and patient data
            return [2 /*return*/, res.json({
                    access_token: tokens.access_token,
                    token_type: tokens.token_type,
                    expires_in: tokens.expires_in,
                    refresh_token: tokens.refresh_token,
                    patient: tokens.patient,
                    patientData: patientData,
                })];
            case 25:
                error_1 = _j.sent();
                message = error_1 instanceof Error ? error_1.message : String(error_1);
                console.error("Token exchange error:", message);
                return [2 /*return*/, res.status(500).json({
                        error: "token_exchange_failed",
                        message: message,
                    })];
            case 26: return [2 /*return*/];
        }
    });
}); });
// Serve static files from dist
var distPath = path_1.default.join(__dirname, "dist");
app.use(express_1.default.static(distPath));
// SPA routing: serve index.html for all non-API routes
app.get("*", function (req, res) {
    res.sendFile(path_1.default.join(distPath, "index.html"));
});
var PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
    console.log("Server running on port ".concat(PORT));
});
