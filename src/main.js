import { isSlidePlaneVisible } from "./slideTransparency.js";
import {normalizeSkyboxLibrary, registerSkyboxSet, unregisterSkyboxSet, renameSkyboxSet, sameSkyboxFaces, missingSkyboxFiles, skyboxEditorChoices, skyboxEditorSelectedValue} from "./skyboxLibrary.js";
import { installWebglProgramDiagnostics } from './webglProgramDiagnostics.js';
import { canMatchLocalRotation } from './rotationGizmoScaleGuard.js';
import { chooseFocusedTransformTarget } from "./transformSelectionPolicy.js";
import { commonAbsoluteAxes, assignAbsoluteAxes } from './selectionAbsoluteAxes.js';
import { shouldFollowSlideCameraView } from './cameraFollowPolicy.js';
import { relativeIdentity, absoluteTargetFromDelta } from './selectionInputMethod.js';
import { createProjectDirectory, validateNewProjectName, createFreshProjectData } from "./newProjectDirectory.js";
import { linkedAbsoluteScale } from './linkedAbsoluteScale.js';
import { createAssetDuplicateEntries } from "./assetDuplicationData.js";
import { initialAssetPosition } from './assetPlacement.js';
import { transitionTiming, durationProgress } from './transitionTiming.js';
import { safeInteractionUrl, normalizeSlideInteraction, safeLocalWebPath } from './slideInteraction.js';
import { createLocalWebPageUrl } from './localWebInteraction.js';
import { scalePositionAboutPivot, multiplyScale, followSlideTranslation } from "./scalePivotMath.js";
import { registerAssets, unregisterAsset, renameAsset, assetFilename, assetDisplayWithFilename, placedAssetDisplay } from "./assetLibrary.js";
import { createCameraNavigation } from "./cameraNavigation.js";
import { installCameraFramingOffset, normalizeCameraFramingOffset } from "./cameraFramingOffset.js";
import { createAtmosphereEffects } from "./atmosphereEffects.js";
import { normalizeAtmosphereEffects, getAtmospherePresetSettings } from "./atmosphereSettings.js";
import { findNonOverlappingOffset, getEditorGuideSignature } from "./editorSpatialTools.js";
import { DEFAULT_CAMERA_NAVIGATION_SETTINGS, loadCameraNavigationSettings, saveCameraNavigationSettings, normalizeCameraNavigationSettings } from "./cameraNavigationSettings.js";
import { countProjectAudioReferences, renameProjectAudioReferences } from "./projectAudioReferences.js";
import { initializePresetSettingsEditor } from "./presetSettingsEditor.js";
import { captureSettings, diffSettings, applySettingsPatch } from "./settingsHistory.js";
import { normalizeAudioAssets, scanAudioDirectory, missingAudioAssets, countAudioReferences, renameAudioReferences } from "./audioLibrary.js";
import {requestPresetName} from './presetNameDialog.js';
import {DEFAULT_EDITOR_CAMERA} from "./editorDefaults.js";
import {t,onLanguageChange} from "./i18n.js";
import { createProjectStatus } from "./projectStatus.js";
import { setWorkspacePanelExpanded } from "./sectionDisclosure.js";
import { organizeLegacyTransformPanels } from "./transformInspectorConsolidation.js";
import { formatInspectorContext } from "./inspectorContext.js";
import { uiSound } from "./uiSound.js";
// ==========================================
// 0. モジュールインポート (Imports)
// ==========================================
import "@babylonjs/core/Debug/debugLayer";

import {
  Engine,
  Scene,
  UniversalCamera,
  Vector3,
  Matrix,
  Quaternion,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Texture,
  CubeTexture,
  Tools,
  Constants,
  ImportMeshAsync,
  GlowLayer,
  PointerEventTypes,
  GizmoManager,
  UtilityLayerRenderer,
  TransformNode,
} from "@babylonjs/core";

import {
  AdvancedDynamicTexture,
  StackPanel,
  Control,
  Button,
} from "@babylonjs/gui/2D";

import "@babylonjs/loaders/glTF";

import "@babylonjs/loaders/SPLAT";

// Scene-4M: isolated, opt-in renderer diagnostics for repeatable Ctrl+R tests.
// Each flag disables only one rendering subsystem; normal operation is unchanged.
const scene4mDebugParams = new URLSearchParams(window.location.search);
const scene4mNoGlow = scene4mDebugParams.get('debugNoGlow') === '1';
const scene4mNoOutline = scene4mDebugParams.get('debugNoOutline') === '1';
const scene4mWebgl1 = scene4mDebugParams.get('debugWebgl1') === '1';
if (scene4mNoGlow || scene4mNoOutline || scene4mWebgl1) {
  console.info('[SlideSpace Scene-4M diagnostic]', {
    noGlow: scene4mNoGlow,
    noOutline: scene4mNoOutline,
    forceWebGL1: scene4mWebgl1,
  });
}

// Opt-in investigation of repeated glGetProgramiv warnings. No suppression.
installWebglProgramDiagnostics({enabled: new URLSearchParams(window.location.search).get('debugWebgl') === '1'});

import { SkyMaterial } from "@babylonjs/materials";

import { rotateAroundAxis } from "./rotationCoordinateMath.js";

import {
  normalizeProjectBgm,
  normalizeSlideScale,
  normalizeSlideBgmOverride,
  normalizeScenePresetBgm,
  normalizeSlideAutoPlayOverride,
  createDefaultProjectData,
  normalizeProjectData,
  resolveTransition,
  resolveSound,
  getScenePresetSafe,
  getScenePresetBgmOverride,
  resolveScenePresetBgm,
  resolveBgm,
  resolveSceneBgmTiming,
  normalizePresentationSettings,
} from "./projectData.js";

import {
  extractFilenameFromPath,
  createSlideImagePathFromId,
  slideImageNameCandidates,
  extractImageIdFromSlideImagePath,
  normalizeSlideImagePath,
} from "./filePathUtils.js";

import {
  degToRad,
  radToDeg,
  radiansToDegrees,
  degreesToRadians,
} from "./mathUtils.js";

import { colorArrayToHex, hexToColorArray } from "./colorUtils.js";

import {
  formatPresentationElapsedTime,
  formatPresentationClock,
  getPresentationOverviewSearchText,
} from "./presentationFormat.js";

import { createDrawingController } from "./drawingController.js";
import { strokeColorWithOpacity } from "./drawingOpacity.js";
import { createSlideDrawingController } from "./slideDrawing.js";

import {
  createSlideClipboardSnapshot,
  createSlideStateFromClipboard,
  createSlideDuplicateState,
} from "./slideClipboardData.js";

import { createAppNotice } from "./appNotice.js";

import { createEditorLayout } from "./editorLayout.js";

import {
  createSlideThumbnailItem,
  bindSlideThumbnailClick,
  bindSlideThumbnailDrag,
  bindSlideThumbnailContextMenu,
} from "./slideListController.js";

import { createSlideContextMenuController } from "./slideContextMenuController.js";
import { chooseCurrentAfterDeletion, preserveCurrentAfterInsertion } from "./slideCurrentPolicy.js";
import { createSlideCommandExecutor } from "./slideCommandExecutor.js";
import { bindNumericCommitInput } from "./numericCommitController.js";
import { bindSliderCommitInput } from "./sliderCommitController.js";
import {
  getSlideIds,
  getActiveSlideImageUrls,
  removeSlidesByIds,
  clearSlideRuntimeImageReferences,
} from "./slideDeletionData.js";
import {
  moveSlideTargetsOneStepLeft,
  moveSlideTargetsOneStepRight,
  moveSelectedSlidesToBoundary,
  gatherSelectedSlidesAroundIndex,
} from "./slideReorderOperations.js";

// import { CloudProceduralTexture } from "@babylonjs/procedural-textures";

// ==========================================
// 1. 定数・設定値 (Constants)
// ==========================================
const MIN_ASSET_SCALE = 0.01;

// カメラ
const cameraShiftInitX = 0.0;

// カメラの視点からのカメラの位置
const cameraShiftInitY = 0.0;

// カメラの視点からのカメラの位置
const cameraShiftInitZ = DEFAULT_EDITOR_CAMERA.position[2];

// カメラの視点からのカメラの位置
const cameraRadiusInit = 1.3;

// カメラの初期状態
const targetInitX = 0;

// カメラの初期状態
const targetInitY = 2;

// カメラの初期状態
const targetInitZ = 0;

// カメラの初期状態
const cameraInitX = targetInitX + cameraShiftInitX;

// カメラの初期状態
const cameraInitY = targetInitY + cameraShiftInitY;

// カメラの初期状態
const cameraInitZ = targetInitZ + cameraShiftInitZ;

// カメラの初期状態
const upInitX = 0;

// カメラの初期状態
const upInitY = 1;

// カメラの初期状態
const upInitZ = 0;

const MAX_EDITOR_HISTORY = 100;

const MULTI_SOUND_MIXED_VALUE = "__mixed__";

const MULTI_SOUND_UNSET_VALUE = "__unset__";

// Presentation
const APP_MODE_EDITOR = "editor";

const APP_MODE_PRESENTATION = "presentation";

const SLIDE_NAV_PREVIOUS = "previous";

const SLIDE_NAV_CURRENT = "current";

const SLIDE_NAV_NEXT = "next";

const SLIDE_NAV_JUMP = "jump";

const PRESENTATION_START_CURRENT = "current";

const PRESENTATION_START_FIRST = "first";

const PRESENTATION_HUD_AUTO_DIM = "auto-dim";

const PRESENTATION_HUD_ALWAYS = "always";
const PRESENTATION_HUD_BAR_LINKED = "bar-linked";

const PRESENTATION_HUD_OFF = "off";

const PRESENTATION_TIME_ELAPSED = "elapsed";

const PRESENTATION_TIME_CLOCK = "clock";

const PRESENTATION_TIME_OFF = "off";

const PRESENTATION_HUD_IDLE_DELAY = 800;

const PRESENTATION_CONTROLS_HIDE_DELAY = 1600;

const PRESENTATION_CONTROLS_HIDE_DELAY_AFTER_FOCUSOUT = 800;

const PRESENTATION_CONTROLS_EDGE_SIZE = 90;

// ==========================================
// 2. 状態変数 (Global States)
// ==========================================

const usedSceneAssetIds = new Set();

const usedSlideIds = new Set();

// URL管理用SetごとにPending URLを管理する
const pendingSlideImageUrlsByProject = new WeakMap();

// スライド情報
let slideCount = 0;

let slideStates = [];

let currentSlideIndex = -1;

let currentProjectDirectoryHandle = null;

let currentProjectData = null;
let atmosphereEffectsController = null;

let projectName = "Untitled";

let activeProjectObjectUrls = new Set();

let actionUiTexture;

let actionPanel;

let actionButton;

let actionURL = "http://localhost:5173/";

let actionEnable = true;

let activeEnvironmentController = null;

// アセット
let mainMeshPath = "";

let spzPath = "";

const scenePresetAssetCache = new Map();

let activeScenePresetName = null;

// Project Panelで編集中のScenePreset
// Canvasに表示されるactiveScenePresetNameとは独立
let editingScenePresetName = null;

let activeGlowLayer = null;

let selectedSceneAssetId = null;
// Scene-2Y: explicit Slide pivot focus, independent of Current and Selection.
let scene2yActiveSlideId = null;
// Scene-2A: canvas selection is separate from the single Asset Gizmo target.
const canvasSelectedAssetIds = new Set();
// Scene-2F: IDs are only unique within a Scene. Store cross-Scene selections
// by the pair (Scene name, Asset ID); the old Set remains the focused Scene UI.
const canvasSelectedAssetKeys = new Map();
// Scene-2O: view-only visibility overrides, keyed by stable Slide IDs and
// (Scene name, Asset ID). They are never included in project.json.
const scene2oHiddenSlideIds = new Set();
const scene2oHiddenAssetIds = new Map();
let scene2oVisibilityProject = null;
const scene2oEnsureVisibilityProject = () => {
  if (scene2oVisibilityProject === currentProjectData) return;
  scene2oVisibilityProject = currentProjectData;
  scene2oHiddenSlideIds.clear();
  scene2oHiddenAssetIds.clear();
};
const scene2oIsSlideHidden = id => {
  scene2oEnsureVisibilityProject();
  return scene2oHiddenSlideIds.has(id);
};
const scene2oIsAssetHidden = (name,id) => {
  scene2oEnsureVisibilityProject();
  return Boolean(scene2oHiddenAssetIds.get(name)?.has(id));
};
const scene2oHideAsset = (name,id) => {
  if (!name || !id) return;
  if (!scene2oHiddenAssetIds.has(name)) scene2oHiddenAssetIds.set(name,new Set());
  scene2oHiddenAssetIds.get(name).add(id);
};

const scene2fSelectAsset = (presetName, assetId, selected = true) => {
  if (!presetName || !assetId) return;
  if (!selected) {
    canvasSelectedAssetKeys.get(presetName)?.delete(assetId);
    if (!canvasSelectedAssetKeys.get(presetName)?.size) canvasSelectedAssetKeys.delete(presetName);
  } else {
    if (!canvasSelectedAssetKeys.has(presetName)) canvasSelectedAssetKeys.set(presetName, new Set());
    canvasSelectedAssetKeys.get(presetName).add(assetId);
  }
};
const scene2fClearAssetSelection = () => canvasSelectedAssetKeys.clear();
// The project loader must reset edit selection and focus as an atomic step.
// Current is deliberately not touched; it is the Scene/Camera context.
const scene2sClearSelectionForProjectOpen = () => {
  scene4cAssetSelectionCleared = false;
  selectedSlideIds.clear();
  slideSelectionAnchorIndex = null;
  canvasSelectedAssetIds.clear();
  scene2fClearAssetSelection();
  selectedSceneAssetId = null;
  scene2yActiveSlideId = null;
};
const scene2fSyncFocusedSelection = () => {
  if (!editingScenePresetName) return;
  // Standalone inspector selections continue to work, even without Canvas picks.
  for (const id of canvasSelectedAssetIds) scene2fSelectAsset(editingScenePresetName, id);
};
let scene2cGizmoGroupEdit = null;
// Scene-2R: selection itself determines whether Slides participate in Asset
// Gizmo group edits. No hidden implicit Current/Slide inclusion checkbox.
// Scene-2P: one shared pivot selection for rotation and scale within each inspector.
// Keep individual editor defaults independent (Slide and Asset) while ensuring that
// Gizmo and numeric transform code read the same selection for both operations.
// Scene-2V: keep group anchor independent of Current and of editing Scene.
let scene2vGroupAnchor = 'active';
const scene2vAveragePosition = (positions) => {
  if (!positions.length) return null;
  const sum = positions.reduce((v,p)=>v.add(Vector3.FromArray(Array.isArray(p) ? p : p.asArray())),Vector3.Zero());
  return sum.scale(1 / positions.length);
};
const scene2vSelectedSlideAnchor = () => scene2vGroupAnchor === 'center'
  ? scene2vAveragePosition(getSelectedSlideEntries().filter(({slideState})=>!scene2oIsSlideHidden(slideState.id)).map(({slideState})=>slideState.position))
  : null;
const scene2vAssetGroupAnchor = (edit) => {
  if (scene2vGroupAnchor !== 'center') return null;
  const positions = [...edit.assets.map(x=>x.before.position), ...edit.slides.map(x=>x.before.position)];
  return scene2vAveragePosition(positions);
};
const slideTransformPivotSelect = document.getElementById("slideTransformPivotMode");
const assetTransformPivotSelect = document.getElementById("assetTransformPivotMode");
// Scene-2W: Selection pivot is one setting for both Gizmo adapters.
// Never re-read a per-kind legacy selector when a mixed Selection switches
// from Slide to Asset (or the reverse).
let scene2wSelectionPivotMode = 'individual';
const transformPivotMode = kind => scene2wSelectionPivotMode;
const rotationPivotMode = transformPivotMode;
const scalePivotMode = transformPivotMode;
const scene2cGroupStatus = document.getElementById("scene2cGroupStatus");



const scenePresetLoadPromises = new Map();

// Asset単位の二重ロード防止
const sceneAssetLoadPromises = new Map();

// プロジェクトRuntimeの世代
let sceneAssetRuntimeGeneration = 0;

// ScenePreset切替要求の世代番号
let scenePresetActivationGeneration = 0;

// Gizmo
let activeGizmoManager = null;

let assetGizmoMode = "position";

// Undo / Redo
let assetGizmoSnapEnabled = false;

const assetGizmoSnapValues = {
  position: 0.5,
  rotation: 15,
  scale: 0.1,
};

const assetGizmoSnapOptions = {
  position: [0.1, 0.5, 1, 5],
  rotation: [5, 15, 45, 90],
  scale: [0.05, 0.1, 0.25, 0.5],
};

let assetGizmoCoordinateMode = "world";

let assetUniformScaleEnabled = true;

// 空
let useSkybox = false;

let turbidity = 10;

let inclination = 0;

let azimuth = 0.5;

let fogColor = new Color3(0.75, 0.75, 0.75);

let fogDensity = 0.002;

// 音声
const projectAudioCache = new Map();

// シーン
let scene = null;

// カメラの視点のスライドからの相対的な位置
let camera = null;

// カメラ
let cameraCurrentPosition, cameraEndPointPosition;

// カメラ移動用
let cameraCurrentRotation, cameraEndPointRotation;

// カメラ移動用
let cameraSpeed = 0.5;

let cameraControlViaKeyboard = true;

let cameraControlViaMouse = false;
let cameraNavigation = null;
let cameraNavigationSettings = loadCameraNavigationSettings();

// update
let smoothSpeed = 5.0;
let activeTransitionDuration = null;
let transitionElapsed = 0;
let transitionStartPosition = null;
let transitionStartRotation = null;

let deltaTime = 0;

// Undo, Redo
const editorUndoStack = [];

const editorRedoStack = [];

let assetTransformBeforeEdit = null;

let editorHistoryBusy = false;
let refreshPresetEditors = () => {};

// Preset
let environmentEditTarget = "preset";

let detectedSkyboxSets = [];
let availableSkyboxFiles = null;
let availableSkyboxFilesProject = null;

const presentationSettings = {
  startMode: PRESENTATION_START_CURRENT,

  loop: true,

  autoFullscreen: false,

  hudMode: PRESENTATION_HUD_AUTO_DIM,

  timeMode: PRESENTATION_TIME_ELAPSED,

  autoPlayOnStart: false,

  autoPlayIntervalSeconds: 8,
};

// Slide
let activeSlideGizmoManager = null;

let slideGizmoMode = "position";

let slideGizmoCoordinateMode = "world";

let slideGizmoSnapEnabled = false;

const slideGizmoSnapValues = {
  position: 0.5,
  rotation: 15,
  scale: 0.1,
};

const slideGizmoSnapOptions = {
  position: [0.1, 0.5, 1, 5],

  rotation: [5, 15, 45, 90],
  scale: [0.01, 0.05, 0.1, 0.5],
};

let draggingSlideIndex = null;

let slideWasDragged = false;

let slideOrderBeforeDrag = null;

let slideCurrentIdBeforeDrag = null;

let slideSelectionBeforeDrag = null;

let draggingSlideIds = null;

let slideTransformBeforeGizmoEdit = null;
let slideGizmoGroupBefore = null;
let scene2wSlideGizmoAssetsBefore = [];

let slideGizmoDragTarget = null;

let slideLabelBeforeEdit = null;

let nextSlideId = 0;

const selectedSlideIds = new Set();

let slideSelectionAnchorIndex = null;

const dirtyMultiInspectorFields = new Set();

const sharedInspectorSectionExpanded = {
  transform: true,
  environment: true,
  transition: true,
  sound: true,
};

let sharedSlideSettingsTargetSignature = null;

// Presentation
let appMode = APP_MODE_EDITOR;

let presentationSession = null;

let presentationHudTimerId = null;

let presentationHudIdleTimeoutId = null;

let presentationEnteredFullscreen = false;

let presentationControlsHideTimeoutId = null;

let presentationSlideJumpEditing = false;

let presentationProgressScrubbing = false;

let presentationProgressPreviewIndex = -1;

let presentationOverviewOpen = false;

let presentationOverviewFocusedIndex = -1;

let presentationOverviewFilteredIndices = [];

let presentationAutoPlayRunning = false;

let presentationAutoPlayTimeoutId = null;

let presentationAutoPlayWasRunningBeforeOverview = false;

let slideScaleLinked = true;

// BGM
// Audio and Blob URLs belong to one session, not to a Slide or Scene.
let presentationBgmRuntime = null;

// Crossfade / fade-in / fade-out /
// same-track volume fade の
// 非同期キャンセル世代。
// Historical name: "CrossfadeGeneration".
let presentationBgmCrossfadeGeneration = 0;

// Crossfadeで消えつつある古いRuntimeだけを保持する
const presentationBgmFadingRuntimes = new Set();

// コピペ
let copiedSlideSnapshots = [];

// 右クリックメニュー

// Project Open / New の同時実行防止
let projectOperationBusy = false;

let projectAssetFileRefreshGeneration = 0;

// Skybox一覧更新要求の世代番号
let skyboxSetRefreshGeneration = 0;

// ==========================================
// 3. DOM 要素キャッシュ (DOM Elements)
// ==========================================
// キャンバス
const canvasContainer = document.querySelector(".canvas-container");

const webglCanvas = document.getElementById("webglCanvas");

const neonDrawingCanvas = document.getElementById("neonDrawingCanvas");

const standardDrawingCanvas = document.getElementById("standardDrawingCanvas");

// スライド
const previousSlideButton = document.getElementById("previousSlideButton");

const currentSlidePage = document.getElementById("currentSlidePage");

const currentSlideButton = document.getElementById("currentSlideButton");

const nextSlideButton = document.getElementById("nextSlideButton");

const cameraControlButton = document.getElementById("cameraControlButton");
const cameraRotationModeSelect = document.getElementById("cameraRotationModeSelect");

const cameraControlStatus = document.getElementById("cameraControlStatus");

const cameraSpeedSelector = document.getElementById("cameraSpeedSelector");

const fullscreenButton = document.getElementById("fullscreenButton");

const fullscreenStatus = document.getElementById("fullscreenStatus");

const screenshotButton = document.getElementById("screenshotButton");

const drawingButton = document.getElementById("drawingButton");
const presentationSlideDrawButton = document.getElementById("presentationSlideDrawButton");
const presentationCameraButton = document.getElementById("presentationCameraButton");
const drawingKeepOnPresentationExit = document.getElementById("drawingKeepOnPresentationExit");
try { drawingKeepOnPresentationExit.checked = localStorage.getItem("slidespace-drawing-keep-presentation-v1") !== "false"; } catch {}
drawingKeepOnPresentationExit?.addEventListener("change", () => {
  try { localStorage.setItem("slidespace-drawing-keep-presentation-v1", String(drawingKeepOnPresentationExit.checked)); } catch {}
});
const presentationBrushStyle = document.getElementById("presentationBrushStyle");
const presentationBrushColor = document.getElementById("presentationBrushColor");
const presentationBrushWidth = document.getElementById("presentationBrushWidth");
const slideNeonGlowStrength = document.getElementById("slideNeonGlowStrength");
const drawingTargetSelect = document.getElementById("drawingTargetSelect");
let presentationDrawingSnapshot = null;
const presentationDrawingUndoStack = [];
const presentationDrawingRedoStack = [];
const presentationDrawingUndoButton = document.getElementById("presentationDrawingUndo");
const presentationDrawingRedoButton = document.getElementById("presentationDrawingRedo");
function refreshPresentationDrawingHistoryUi() {
  if (presentationDrawingUndoButton) presentationDrawingUndoButton.disabled = !presentationDrawingSnapshot || !presentationDrawingUndoStack.length;
  if (presentationDrawingRedoButton) presentationDrawingRedoButton.disabled = !presentationDrawingSnapshot || !presentationDrawingRedoStack.length;
}
function recordPresentationDrawingHistory(item) {
  if (!presentationDrawingSnapshot) return false;
  presentationDrawingUndoStack.push(structuredClone(item));
  if (presentationDrawingUndoStack.length > 100) presentationDrawingUndoStack.shift();
  presentationDrawingRedoStack.length = 0;
  refreshPresentationDrawingHistoryUi();
  return true;
}
function applyPresentationDrawingEntry(item, direction) {
  if (item.type === "screen") {
    drawingController.setScreenStrokes(item[direction]);
  } else if (item.type === "slide") {
    for (const change of item.changes) {
      const slide = slideStates.find(s => s.id === change.slideId);
      if (!slide) continue;
      slide.drawings = structuredClone(change[direction]);
      slideDrawing.refreshSlide(slide);
    }
    renderSlideThumbnails();
  }
}
function presentationDrawingStep(redo = false) {
  if (!presentationDrawingSnapshot) return;
  const from = redo ? presentationDrawingRedoStack : presentationDrawingUndoStack;
  const to = redo ? presentationDrawingUndoStack : presentationDrawingRedoStack;
  const item = from.pop();
  if (!item) return;
  applyPresentationDrawingEntry(item, redo ? "after" : "before");
  to.push(item);
  refreshPresentationDrawingHistoryUi();
  uiSound.play();
}
presentationDrawingUndoButton?.addEventListener("click", () => presentationDrawingStep(false));
presentationDrawingRedoButton?.addEventListener("click", () => presentationDrawingStep(true));


const drawingStatus = document.getElementById("drawingStatus");

const layerSwitch = document.getElementById("layerSwitch");

const layerSwitchLabel = document.getElementById("layerSwitchLabel");

const colorOptions = document.querySelectorAll(".color-option");

const lineWidthOptions = document.querySelectorAll(".line-width-option");

const fadeTimeInput = document.getElementById("fadeTime");

const clearDrawingsButton = document.getElementById("clearDrawingsButton");

const turbidityValue = document.getElementById("turbidityValue");

const turbiditySlider = document.getElementById("turbiditySlider");

const inclinationValue = document.getElementById("inclinationValue");

const inclinationSlider = document.getElementById("inclinationSlider");

const azimuthValue = document.getElementById("azimuthValue");

const azimuthSlider = document.getElementById("azimuthSlider");

const fogColorPicker = document.getElementById("fogColorPicker");

const fogDensityValue = document.getElementById("fogDensityValue");

const fogDensitySlider = document.getElementById("fogDensitySlider");

// 情報表示
const webglCanvasX = document.getElementById("webglCanvasX");

const webglCanvasY = document.getElementById("webglCanvasY");

const webglWorldPosX = document.getElementById("webglWorldPosX");

const webglWorldPosY = document.getElementById("webglWorldPosY");

const webglWorldPosZ = document.getElementById("webglWorldPosZ");

const webglWorldRightX = document.getElementById("webglWorldRightX");

const webglWorldRightY = document.getElementById("webglWorldRightY");

const webglWorldRightZ = document.getElementById("webglWorldRightZ");

const webglWorldForwardX = document.getElementById("webglWorldForwardX");

const webglWorldForwardY = document.getElementById("webglWorldForwardY");

const webglWorldForwardZ = document.getElementById("webglWorldForwardZ");

const webglWorldUpX = document.getElementById("webglWorldUpX");

const webglWorldUpY = document.getElementById("webglWorldUpY");

const webglWorldUpZ = document.getElementById("webglWorldUpZ");

const webglWorldAngleX = document.getElementById("webglWorldAngleX");

const webglWorldAngleY = document.getElementById("webglWorldAngleY");

const webglWorldAngleZ = document.getElementById("webglWorldAngleZ");

const thumbnailContainer = document.getElementById("thumbnailContainer");

const openProjectButton = document.getElementById("openProjectButton");

const newProjectButton = document.getElementById("newProjectButton");

const currentProjectName = document.getElementById("currentProjectName");

const projectLoadStatus = document.getElementById("projectLoadStatus");

const recordSlideButton = document.getElementById("recordSlideButton");

const saveProjectButton = document.getElementById("saveProjectButton");

// Preset, Override Editor UI
const slideSettingsEmptyMessage = document.getElementById(
  "slideSettingsEmptyMessage",
);

const slideSettingsContent = document.getElementById("slideSettingsContent");

const scenePresetSelector = document.getElementById("scenePresetSelector");

const environmentOverrideStatus = document.getElementById(
  "environmentOverrideStatus",
);

const clearEnvironmentOverrideButton = document.getElementById(
  "clearEnvironmentOverrideButton",
);

// Asset
const sceneAssetSelector = document.getElementById("sceneAssetSelector");
const scenePlacedAssetSelector = document.getElementById("scenePlacedAssetSelector");
const scenePlacedAssetInfo = document.getElementById("scenePlacedAssetInfo");

const sceneAssetEmptyMessage = document.getElementById(
  "sceneAssetEmptyMessage",
);

const sceneAssetEditorContent = document.getElementById(
  "sceneAssetEditorContent",
);

const selectedAssetId = document.getElementById("selectedAssetId");

const selectedAssetType = document.getElementById("selectedAssetType");

const selectedAssetSource = document.getElementById("selectedAssetSource");

const assetPositionX = document.getElementById("assetPositionX");

const assetPositionY = document.getElementById("assetPositionY");

const assetPositionZ = document.getElementById("assetPositionZ");

const assetRotationPitch = document.getElementById("assetRotationPitch");

const assetRotationYaw = document.getElementById("assetRotationYaw");

const assetRotationRoll = document.getElementById("assetRotationRoll");

const assetScaleX = document.getElementById("assetScaleX");

const assetScaleY = document.getElementById("assetScaleY");

const assetScaleZ = document.getElementById("assetScaleZ");

const assetGlowCheck = document.getElementById("assetGlowCheck");

const resetAssetTransformButton = document.getElementById(
  "resetAssetTransformButton",
);

// Gizmo
const projectAssetFileSelector = document.getElementById(
  "projectAssetFileSelector",
);

const refreshProjectAssetFilesButton = document.getElementById("refreshProjectAssetFilesButton");
const projectAssetLibrarySelector = document.getElementById("projectAssetLibrarySelector");
const projectAssetLibraryStatus = document.getElementById("projectAssetLibraryStatus");
const projectAssetImportButton = document.getElementById("projectAssetImportButton");
const projectAssetImportInput = document.getElementById("projectAssetImportInput");
const projectAssetUnregisterButton = document.getElementById("projectAssetUnregisterButton");
const projectAssetRenameButton = document.getElementById("projectAssetRenameButton");
const projectAssetResetNameButton = document.getElementById("projectAssetResetNameButton");
const assetLibraryActionDialog = document.getElementById("assetLibraryActionDialog");
const assetLibraryActionForm = document.getElementById("assetLibraryActionForm");
const assetLibraryActionTitle = document.getElementById("assetLibraryActionTitle");
const assetLibraryActionDescription = document.getElementById("assetLibraryActionDescription");
const assetLibraryNameLabel = document.getElementById("assetLibraryNameLabel");
const assetLibraryNameInput = document.getElementById("assetLibraryNameInput");
const assetLibraryActionError = document.getElementById("assetLibraryActionError");
const assetLibraryActionConfirm = document.getElementById("assetLibraryActionConfirm");
const assetLibraryActionCancel = document.getElementById("assetLibraryActionCancel");
let assetLibraryPendingAction = null;


const addSceneAssetButton = document.getElementById("addSceneAssetButton");

const duplicateSceneAssetButton = document.getElementById(
  "duplicateSceneAssetButton",
);

const deleteSceneAssetButton = document.getElementById(
  "deleteSceneAssetButton",
);

const assetUniformScaleCheck = document.getElementById(
  "assetUniformScaleCheck",
);

const assetUniformScaleInput = document.getElementById(
  "assetUniformScaleInput",
);

// Undo,  redo
const undoEditorButton = document.getElementById("undoEditorButton");

const redoEditorButton = document.getElementById("redoEditorButton");

// Preset
const createScenePresetButton = document.getElementById(
  "createScenePresetButton",
);

const duplicateScenePresetButton = document.getElementById(
  "duplicateScenePresetButton",
);

const renameScenePresetButton = document.getElementById(
  "renameScenePresetButton",
);

const deleteScenePresetButton = document.getElementById(
  "deleteScenePresetButton",
);

const editEnvironmentPresetButton = document.getElementById(
  "editEnvironmentPresetButton",
);

const editEnvironmentOverrideButton = document.getElementById(
  "editEnvironmentOverrideButton",
);

const skyboxSetSelector = document.getElementById("skyboxSetSelector");

const skyboxEditorStatus = document.getElementById("skyboxEditorStatus");

const skyboxPathPx = document.getElementById("skyboxPathPx");

const skyboxPathPy = document.getElementById("skyboxPathPy");

const skyboxPathPz = document.getElementById("skyboxPathPz");

const skyboxPathNx = document.getElementById("skyboxPathNx");

const skyboxPathNy = document.getElementById("skyboxPathNy");

const skyboxPathNz = document.getElementById("skyboxPathNz");

// スライド
const duplicateSlideButton = document.getElementById("duplicateSlideButton");

const deleteSlideButton = document.getElementById("deleteSlideButton");

const moveSlideEarlierButton = document.getElementById(
  "moveSlideEarlierButton",
);

const moveSlideLaterButton = document.getElementById("moveSlideLaterButton");

const currentSlidePositionLabel = document.getElementById(
  "currentSlidePositionLabel",
);

const slideOrderDisplay = document.getElementById("slideOrderDisplay");

const slideIdDisplay = document.getElementById("slideIdDisplay");

const slideLabelInput = document.getElementById("slideLabelInput");

const slideFilenameDisplay = document.getElementById("slideFilenameDisplay");

const slideImageIdInput = document.getElementById("slideImageIdInput");

const applySlideImageIdButton = document.getElementById(
  "applySlideImageIdButton",
);
const chooseSlideImageButton = document.getElementById("chooseSlideImageButton");
const slideImageFileInput = document.getElementById("slideImageFileInput");

const placeSlideInFrontOfCameraButton = document.getElementById(
  "placeSlideInFrontOfCameraButton",
);

const toolbarCurrentSlideStatus = document.getElementById(
  "toolbarCurrentSlideStatus",
);

const slideSelectionStatus = document.getElementById("slideSelectionStatus");

const currentSlideInspector = document.getElementById("currentSlideInspector");

const slideSelectionInspector = document.getElementById(
  "slideSelectionInspector",
);

const multiSlideInspectorSelectionCount = document.getElementById(
  "multiSlideInspectorSelectionCount",
);

const slideOperationTargetHint = document.getElementById(
  "slideOperationTargetHint",
);

const multiScenePresetSelect = document.getElementById(
  "multiScenePresetSelect",
);

const multiTransitionPresetSelect = document.getElementById(
  "multiTransitionPresetSelect",
);

const multiSoundPresetSelect = document.getElementById(
  "multiSoundPresetSelect",
);

const multiGatherButton = document.getElementById("multiGatherButton");

const multiMoveToStartButton = document.getElementById(
  "multiMoveToStartButton",
);

const multiMoveToEndButton = document.getElementById("multiMoveToEndButton");

const slideInspectorTitle = document.getElementById("slideInspectorTitle");

const multiSelectedSlideList = document.getElementById(
  "multiSelectedSlideList",
);

const multiCurrentSlideInfo = document.getElementById("multiCurrentSlideInfo");

const multiFogDensityInput = document.getElementById("multiFogDensityInput");
const multiFogDensitySlider = document.getElementById("multiFogDensitySlider");

const multiFogColorInput = document.getElementById("multiFogColorInput");

const multiFogColorMixedLabel = document.getElementById(
  "multiFogColorMixedLabel",
);

const multiUseSkyboxSelect = document.getElementById("multiUseSkyboxSelect");

const multiClearEnvironmentOverridesButton = document.getElementById(
  "multiClearEnvironmentOverridesButton",
);

const multiTurbidityInput = document.getElementById("multiTurbidityInput");

const multiInclinationInput = document.getElementById("multiInclinationInput");

const multiAzimuthInput = document.getElementById("multiAzimuthInput");
const environmentSkySliders = {
  turbidity: document.getElementById("multiTurbiditySlider"),
  inclination: document.getElementById("multiInclinationSlider"),
  azimuth: document.getElementById("multiAzimuthSlider"),
};

const multiPreviousSpeedInput = document.getElementById(
  "multiPreviousSpeedInput",
);

const multiCurrentSpeedInput = document.getElementById(
  "multiCurrentSpeedInput",
);

const multiNextSpeedInput = document.getElementById("multiNextSpeedInput");
const transitionSpeedSliders = {
  previousSpeed: document.getElementById("multiPreviousSpeedSlider"),
  currentSpeed: document.getElementById("multiCurrentSpeedSlider"),
  nextSpeed: document.getElementById("multiNextSpeedSlider"),
};
const slideScaleSliders = { x: document.getElementById("multiScaleXSlider"), y: document.getElementById("multiScaleYSlider"), z: document.getElementById("multiScaleZSlider") };
const cameraDistanceSlider = document.getElementById("multiCameraDistanceSlider");
const assetScaleSliders = { x: document.getElementById("assetScaleXSlider"), y: document.getElementById("assetScaleYSlider"), z: document.getElementById("assetScaleZSlider") };
let forceTransitionSliderSync = false;
let forceCameraDistanceSliderSync = false;


const multiClearTransitionOverridesButton = document.getElementById(
  "multiClearTransitionOverridesButton",
);

const multiPreviousSoundSelect = document.getElementById(
  "multiPreviousSoundSelect",
);

const multiCurrentSoundSelect = document.getElementById(
  "multiCurrentSoundSelect",
);

const multiNextSoundSelect = document.getElementById("multiNextSoundSelect");

const multiClearSoundOverridesButton = document.getElementById(
  "multiClearSoundOverridesButton",
);




const multiPendingActions = document.querySelector(
  ".multi-slide-pending-actions",
);







const multiTurbidityState = document.getElementById("multiTurbidityState");

const multiInclinationState = document.getElementById("multiInclinationState");

const multiAzimuthState = document.getElementById("multiAzimuthState");

const multiFogDensityState = document.getElementById("multiFogDensityState");

const multiFogColorState = document.getElementById("multiFogColorState");

const multiUseSkyboxState = document.getElementById("multiSkyboxState");

const multiPreviousSpeedState = document.getElementById(
  "multiPreviousSpeedState",
);

const multiCurrentSpeedState = document.getElementById(
  "multiCurrentSpeedState",
);

const multiNextSpeedState = document.getElementById("multiNextSpeedState");

const multiPreviousSoundState = document.getElementById(
  "multiPreviousSoundState",
);

const multiCurrentSoundState = document.getElementById(
  "multiCurrentSoundState",
);

const multiNextSoundState = document.getElementById("multiNextSoundState");

const multiEnvironmentSectionToggle = document.getElementById(
  "multiEnvironmentSectionToggle",
);

const multiEnvironmentSectionChevron = document.getElementById(
  "multiEnvironmentSectionChevron",
);

const multiEnvironmentSectionBody = document.getElementById(
  "multiEnvironmentSectionBody",
);

const multiTransitionSectionToggle = document.getElementById(
  "multiTransitionSectionToggle",
);

const multiTransitionSectionChevron = document.getElementById(
  "multiTransitionSectionChevron",
);

const multiTransitionSectionBody = document.getElementById(
  "multiTransitionSectionBody",
);

const multiSoundSectionToggle = document.getElementById(
  "multiSoundSectionToggle",
);

const multiSoundSectionChevron = document.getElementById(
  "multiSoundSectionChevron",
);

const multiSoundSectionBody = document.getElementById("multiSoundSectionBody");
const slideTransitionUseOverride = document.getElementById("slideTransitionUseOverride");
const slideSoundUseOverride = document.getElementById("slideSoundUseOverride");

const multiExpandAllSectionsButton = document.getElementById(
  "multiExpandAllSectionsButton",
);

const multiCollapseAllSectionsButton = document.getElementById(
  "multiCollapseAllSectionsButton",
);


const multiTransformSectionToggle = document.getElementById(
  "multiTransformSectionToggle",
);

const multiTransformSectionChevron = document.getElementById(
  "multiTransformSectionChevron",
);

const multiTransformSectionBody = document.getElementById(
  "multiTransformSectionBody",
);

const multiTransformSection = document.getElementById("multiTransformSection");

const slideTransformTargetLabel = document.getElementById(
  "slideTransformTargetLabel",
);

const multiPositionXInput = document.getElementById("multiPositionXInput");

const multiPositionYInput = document.getElementById("multiPositionYInput");

const multiPositionZInput = document.getElementById("multiPositionZInput");

const multiPositionXDeltaInput = document.getElementById(
  "multiPositionXDeltaInput",
);

const multiPositionYDeltaInput = document.getElementById(
  "multiPositionYDeltaInput",
);

const multiPositionZDeltaInput = document.getElementById(
  "multiPositionZDeltaInput",
);







const multiApplyPositionXDeltaButton = document.getElementById(
  "multiApplyPositionXDeltaButton",
);

const multiApplyPositionYDeltaButton = document.getElementById(
  "multiApplyPositionYDeltaButton",
);

const multiApplyPositionZDeltaButton = document.getElementById(
  "multiApplyPositionZDeltaButton",
);

const multiRotationSliders = {
  pitch: document.getElementById("multiRotationPitchSlider"),
  yaw: document.getElementById("multiRotationYawSlider"),
  roll: document.getElementById("multiRotationRollSlider"),
};
const multiRotationPitchInput = document.getElementById(
  "multiRotationPitchInput",
);

const multiRotationYawInput = document.getElementById("multiRotationYawInput");

const multiRotationRollInput = document.getElementById(
  "multiRotationRollInput",
);

const multiRotationPitchDeltaInput = document.getElementById(
  "multiRotationPitchDeltaInput",
);

const multiRotationYawDeltaInput = document.getElementById(
  "multiRotationYawDeltaInput",
);

const multiRotationRollDeltaInput = document.getElementById(
  "multiRotationRollDeltaInput",
);







const multiApplyRotationPitchDeltaButton = document.getElementById(
  "multiApplyRotationPitchDeltaButton",
);

const multiApplyRotationYawDeltaButton = document.getElementById(
  "multiApplyRotationYawDeltaButton",
);

const multiApplyRotationRollDeltaButton = document.getElementById(
  "multiApplyRotationRollDeltaButton",
);


const multiCameraDistanceInput = document.getElementById(
  "multiCameraDistanceInput",
);

const multiCameraDistanceDeltaInput = document.getElementById(
  "multiCameraDistanceDeltaInput",
);

const multiApplyCameraDistanceDeltaButton = document.getElementById(
  "multiApplyCameraDistanceDeltaButton",
);


const sharedSlideSettings = document.getElementById("sharedSlideSettings");

const slideSettingsTargetLabel = document.getElementById(
  "slideSettingsTargetLabel",
);

// Presentation
const editorApp = document.querySelector(".editor-app");

const presentButton = document.getElementById("presentButton");

const presentationOverlay = document.getElementById("presentationOverlay");

const presentationSlideNumber = document.getElementById(
  "presentationSlideNumber",
);

const presentationSlideCount = document.getElementById(
  "presentationSlideCount",
);

const presentationElapsedTime = document.getElementById(
  "presentationElapsedTime",
);

const presentationLoopStatus = document.getElementById(
  "presentationLoopStatus",
);

const presentationStartMode = document.getElementById("presentationStartMode");

const presentationLoop = document.getElementById("presentationLoop");

const presentationAutoFullscreen = document.getElementById(
  "presentationAutoFullscreen",
);

const presentationHudMode = document.getElementById("presentationHudMode");

const presentationTimeMode = document.getElementById("presentationTimeMode");

const presentationControls = document.getElementById("presentationControls");

const presentationPreviousButton = document.getElementById(
  "presentationPreviousButton",
);

const presentationNextButton = document.getElementById(
  "presentationNextButton",
);

const presentationFullscreenButton = document.getElementById(
  "presentationFullscreenButton",
);

const presentationExitButton = document.getElementById(
  "presentationExitButton",
);

const presentationControlSlideNumber = document.getElementById(
  "presentationControlSlideNumber",
);

const presentationControlSlideCount = document.getElementById(
  "presentationControlSlideCount",
);

const presentationSlideJumpButton = document.getElementById(
  "presentationSlideJumpButton",
);

const presentationSlideJumpInput = document.getElementById(
  "presentationSlideJumpInput",
);

const presentationProgressBar = document.getElementById(
  "presentationProgressBar",
);

const presentationProgressTrack = document.getElementById(
  "presentationProgressTrack",
);

const presentationProgressPreview = document.getElementById(
  "presentationProgressPreview",
);

const presentationOverviewButton = document.getElementById(
  "presentationOverviewButton",
);

const presentationOverview = document.getElementById("presentationOverview");

const presentationOverviewGrid = document.getElementById(
  "presentationOverviewGrid",
);

const presentationOverviewStatus = document.getElementById(
  "presentationOverviewStatus",
);

const presentationOverviewCloseButton = document.getElementById(
  "presentationOverviewCloseButton",
);

const presentationOverviewSearch = document.getElementById(
  "presentationOverviewSearch",
);

const presentationAutoPlayOnStart = document.getElementById(
  "presentationAutoPlayOnStart",
);

const presentationAutoPlayInterval = document.getElementById(
  "presentationAutoPlayInterval",
);

const presentationAutoPlayButton = document.getElementById(
  "presentationAutoPlayButton",
);

// Scale
const multiScaleZInput = document.getElementById("multiScaleZInput");
const multiScaleZDeltaInput = document.getElementById("multiScaleZDeltaInput");
const multiApplyScaleZDeltaButton = document.getElementById("multiApplyScaleZDeltaButton");
const multiScaleXInput = document.getElementById("multiScaleXInput");

const multiScaleYInput = document.getElementById("multiScaleYInput");

const multiScaleXDeltaInput = document.getElementById("multiScaleXDeltaInput");

const multiScaleYDeltaInput = document.getElementById("multiScaleYDeltaInput");

const multiApplyScaleXDeltaButton = document.getElementById(
  "multiApplyScaleXDeltaButton",
);

const multiApplyScaleYDeltaButton = document.getElementById(
  "multiApplyScaleYDeltaButton",
);

const multiScaleLinkButton = document.getElementById("multiScaleLinkButton");

const multiSlideScaleResetButton = document.getElementById(
  "multiSlideScaleResetButton",
);

// BGM












const presentationBgmNotice = document.getElementById("presentationBgmNotice");

const presentationBgmMessage = document.getElementById(
  "presentationBgmMessage",
);

const presentationBgmRetryButton = document.getElementById(
  "presentationBgmRetryButton",
);

const slideBgmUseOverride = document.getElementById("slideBgmUseOverride");

const slideBgmEnabled = document.getElementById("slideBgmEnabled");

const slideBgmSoundSelect = document.getElementById("slideBgmSoundSelect");

const slideBgmVolume = document.getElementById("slideBgmVolume");
const slideBgmVolumeSlider = document.getElementById("slideBgmVolumeSlider");

const slideBgmLoop = document.getElementById("slideBgmLoop");


const slideBgmClearButton = document.getElementById("slideBgmClearButton");
const slideBgmFadeIn = document.getElementById("slideBgmFadeIn");
const slideBgmFadeOut = document.getElementById("slideBgmFadeOut");
const slideBgmContinueSame = document.getElementById("slideBgmContinueSame");

const slideBgmEffectiveValue = document.getElementById(
  "slideBgmEffectiveValue",
);

const sceneTransitionMode = document.getElementById("sceneTransitionMode");
const sceneSoundMode = document.getElementById("sceneSoundMode");
const sceneTransitionPresetRow = document.getElementById("sceneTransitionPresetRow");
const sceneSoundPresetRow = document.getElementById("sceneSoundPresetRow");
const sceneTransitionCustomDetails = document.getElementById("sceneTransitionCustomDetails");
const sceneSoundCustomDetails = document.getElementById("sceneSoundCustomDetails");
const sceneCustomTransitionControls = Object.fromEntries(["previousSpeed","currentSpeed","nextSpeed","previousDuration","currentDuration","nextDuration"].map((key) => [key,document.getElementById(`sceneCustom${key[0].toUpperCase()+key.slice(1)}`)]));
const sceneCustomTransitionTimingMode = document.getElementById('sceneCustomTransitionTimingMode');
const sceneTransitionSpeedFields = document.getElementById('sceneTransitionSpeedFields');
const sceneTransitionDurationFields = document.getElementById('sceneTransitionDurationFields');
const slideCustomTransitionTimingMode = document.getElementById('slideCustomTransitionTimingMode');
const slideTransitionSpeedFields = document.getElementById('slideTransitionSpeedFields');
const slideTransitionDurationFields = document.getElementById('slideTransitionDurationFields');
const transitionDurationInputs = Object.fromEntries(['previousDuration','currentDuration','nextDuration'].map(key=>[key,document.getElementById(`multi${key[0].toUpperCase()+key.slice(1)}Input`)]));
const sceneCustomSoundControls = Object.fromEntries(["previous","current","next"].map((key) => [key,document.getElementById(`sceneCustom${key[0].toUpperCase()+key.slice(1)}Sound`)]));
const slideTransitionMode = document.getElementById("slideTransitionMode");
const slideSoundMode = document.getElementById("slideSoundMode");
const slideTransitionPresetRow = document.getElementById("slideTransitionPresetRow");
const slideSoundPresetRow = document.getElementById("slideSoundPresetRow");
const slideTransitionCustomDetails = document.getElementById("slideTransitionCustomDetails");
const slideSoundCustomDetails = document.getElementById("slideSoundCustomDetails");
const sceneTransitionPreset = document.getElementById("sceneTransitionPreset");
const sceneSoundPreset = document.getElementById("sceneSoundPreset");
const sceneBgmFadeIn = document.getElementById("sceneBgmFadeIn");
const sceneBgmFadeOut = document.getElementById("sceneBgmFadeOut");
const sceneBgmContinueSame = document.getElementById("sceneBgmContinueSame");
const scenePresetBgmUseOverride = document.getElementById(
  "scenePresetBgmUseOverride",
);
const scenePresetBgmFallbackNote = document.getElementById("scenePresetBgmFallbackNote");

const scenePresetBgmEnabled = document.getElementById("scenePresetBgmEnabled");

const scenePresetBgmSound = document.getElementById("scenePresetBgmSound");

const scenePresetBgmVolume = document.getElementById("scenePresetBgmVolume");
const scenePresetBgmVolumeSlider = document.getElementById("scenePresetBgmVolumeSlider");

const scenePresetBgmLoop = document.getElementById("scenePresetBgmLoop");


const scenePresetBgmClearButton = document.getElementById(
  "scenePresetBgmClearButton",
);

const scenePresetBgmEffective = document.getElementById(
  "scenePresetBgmEffective",
);









const slideAutoPlayUseOverride = document.getElementById(
  "slideAutoPlayUseOverride",
);

const slideAutoPlayInterval = document.getElementById("slideAutoPlayInterval");

const slideAutoPlayClearButton = document.getElementById(
  "slideAutoPlayClearButton",
);

const slideAutoPlayEffectiveValue = document.getElementById(
  "slideAutoPlayEffectiveValue",
);

// appNotice
const appNotice = document.getElementById("appNotice");

const appNoticeMessage = document.getElementById("appNoticeMessage");

const appNoticeCloseButton = document.getElementById("appNoticeCloseButton");

// コピペ
const copySlideButton = document.getElementById("copySlideButton");

const pasteSlideButton = document.getElementById("pasteSlideButton");

// 右クリックメニュー
const slideContextMenu = document.getElementById("slideContextMenu");

// お絵描き
const neonDrawingCtx = neonDrawingCanvas.getContext("2d");

const standardDrawingCtx = standardDrawingCanvas.getContext("2d");

const multiEnvironmentSection = multiEnvironmentSectionBody.closest(
  ".multi-slide-collapsible-section",
);

const multiTransitionSection = multiTransitionSectionBody.closest(
  ".multi-slide-collapsible-section",
);

const multiSoundSection = multiSoundSectionBody.closest(
  ".multi-slide-collapsible-section",
);

// Panel
const projectPanel = document.getElementById("projectPanel");

const slidePanel = document.getElementById("slidePanel");

const projectPanelResizer = document.getElementById("projectPanelResizer");

const slidePanelResizer = document.getElementById("slidePanelResizer");

const projectPanelCollapseButton = document.getElementById(
  "projectPanelCollapseButton",
);

const slidePanelCollapseButton = document.getElementById(
  "slidePanelCollapseButton",
);

const projectPanelProjectName = document.getElementById(
  "projectPanelProjectName",
);

const projectPanelEditingPreset = document.getElementById(
  "projectPanelEditingPreset",
);

const projectContextProjectName = document.getElementById(
  "projectContextProjectName",
);

const projectContextEditingPreset = document.getElementById(
  "projectContextEditingPreset",
);

// ==========================================
// 4. DOM-Dependent Runtime
// ==========================================
//
// DOM Elementsから構成・初期化される配列、UI定義、
// Engine、Observerなどのruntime objects。
// ==========================================

const assetTransformInputs = [
  assetPositionX,
  assetPositionY,
  assetPositionZ,
  assetRotationPitch,
  assetRotationYaw,
  assetRotationRoll,
  assetScaleX,
  assetScaleY,
  assetScaleZ,
  assetUniformScaleInput,
];

// エンジン
const engine = new Engine(webglCanvas, true, { disableWebGL2Support: scene4mWebgl1 });

// Canvas Resize Observer
const canvasResizeObserver = new ResizeObserver(() => {
  if (engine) {
    engine.resize();
  }
});

const sharedInspectorSectionUi = {
  transform: {
    toggle: multiTransformSectionToggle,
    chevron: multiTransformSectionChevron,
    body: multiTransformSectionBody,
  },

  environment: {
    toggle: multiEnvironmentSectionToggle,
    chevron: multiEnvironmentSectionChevron,
    body: multiEnvironmentSectionBody,
  },

  transition: {
    toggle: multiTransitionSectionToggle,
    chevron: multiTransitionSectionChevron,
    body: multiTransitionSectionBody,
  },

  sound: {
    toggle: multiSoundSectionToggle,
    chevron: multiSoundSectionChevron,
    body: multiSoundSectionBody,
  },
};

// ==========================================
// 5. 純粋関数・ユーティリティ (Pure Functions)
// ==========================================

// クリックされたときのアニメーション用
const applyButtonEffect = function (buttonElement) {
  buttonElement.classList.add("button-press-effect");
  setTimeout(() => {
    buttonElement.classList.remove("button-press-effect");
  }, 200);
};

// マウス座標取得
const getPointerPos = function (canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
};

const getTimeStamp = function () {
  // ファイル名をのためのタイムスタンプを作成（YYYYMMDD-HHmmssSSSの形式）
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const milliseconds = String(now.getMilliseconds()).padStart(3, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;
};

const vector3ToArray = function (v) {
  return [Number(v.x), Number(v.y), Number(v.z)];
};

const quaternionToArray = function (q) {
  return [Number(q.x), Number(q.y), Number(q.z), Number(q.w)];
};

const getSkyboxConfigKey = function (skyboxConfig) {
  if (!skyboxConfig) {
    return "";
  }

  return JSON.stringify({
    px: skyboxConfig.px ?? "",
    py: skyboxConfig.py ?? "",
    pz: skyboxConfig.pz ?? "",
    nx: skyboxConfig.nx ?? "",
    ny: skyboxConfig.ny ?? "",
    nz: skyboxConfig.nz ?? "",
  });
};

const cloneAssetTransform = function (transform) {
  return {
    position: [
      Number(transform.position[0]),

      Number(transform.position[1]),

      Number(transform.position[2]),
    ],

    rotation: [
      Number(transform.rotation[0]),

      Number(transform.rotation[1]),

      Number(transform.rotation[2]),

      Number(transform.rotation[3]),
    ],

    scale: [
      Number(transform.scale[0]),

      Number(transform.scale[1]),

      Number(transform.scale[2]),
    ],
  };
};

const assetTransformsEqual = function (a, b, epsilon = 1e-8) {
  if (!a || !b) {
    return false;
  }

  const arraysEqual = function (x, y) {
    if (x.length !== y.length) {
      return false;
    }

    return x.every(
      (value, index) => Math.abs(Number(value) - Number(y[index])) < epsilon,
    );
  };

  return (
    arraysEqual(a.position, b.position) &&
    arraysEqual(a.rotation, b.rotation) &&
    arraysEqual(a.scale, b.scale)
  );
};

const insertAssetConfigAtIndex = function (preset, assetConfig, index) {
  if (!preset) {
    return;
  }

  preset.assets ??= [];

  const safeIndex = Math.max(0, Math.min(Number(index), preset.assets.length));

  preset.assets.splice(safeIndex, 0, assetConfig);
};

const normalizePresetName = function (value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "-");
};

const isEditableElement = function (element) {
  if (!element) {
    return false;
  }

  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element.isContentEditable
  );
};

const moveArrayItem = function (array, fromIndex, toIndex) {
  if (fromIndex === toIndex) {
    return;
  }

  const [item] = array.splice(fromIndex, 1);

  array.splice(toIndex, 0, item);
};

const areEditorValuesEqual = function (a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((value, index) => value === b[index]);
  }

  return a === b;
};

// プロジェクト読み込み
const readJsonFileFromDirectory = async function (directoryHandle, filename) {
  try {
    const fileHandle = await directoryHandle.getFileHandle(filename);

    const file = await fileHandle.getFile();

    const text = await file.text();

    return JSON.parse(text);
  } catch (error) {
    if (error.name === "NotFoundError") {
      return null;
    }

    throw error;
  }
};

const getProjectFile = async function (rootDirectoryHandle, relativePath) {
  if (!rootDirectoryHandle) {
    throw new Error("Project directory is not available.");
  }

  const normalizedPath = String(relativePath ?? "")
    .replaceAll("\\", "/")
    .trim();

  const parts = normalizedPath.split("/").filter(Boolean);

  if (parts.length === 0) {
    throw new Error("Invalid project file path.");
  }

  let directoryHandle = rootDirectoryHandle;

  for (let i = 0; i < parts.length - 1; i++) {
    directoryHandle = await directoryHandle.getDirectoryHandle(parts[i]);
  }

  const filename = parts[parts.length - 1];

  const fileHandle = await directoryHandle.getFileHandle(filename);

  return await fileHandle.getFile();
};

const revokeObjectUrls = function (urls) {
  if (!(urls instanceof Set)) {
    return;
  }

  for (const url of urls) {
    URL.revokeObjectURL(url);
  }

  urls.clear();
};

const revokeOwnedObjectUrl = function (urlSet, url) {
  if (!(urlSet instanceof Set)) {
    return false;
  }

  if (typeof url !== "string" || !urlSet.has(url)) {
    return false;
  }

  URL.revokeObjectURL(url);

  urlSet.delete(url);

  return true;
};

const isSlideImageUrlInUse = function (imageUrl, excludeSlideState = null) {
  if (!imageUrl) {
    return false;
  }

  return slideStates.some((slideState) => {
    if (slideState === excludeSlideState) {
      return false;
    }

    return (
      slideState.activeImageUrl === imageUrl &&
      slideState.mesh &&
      !slideState.mesh.isDisposed()
    );
  });
};

const getPendingSlideImageUrls = function (urlSet, createIfMissing = false) {
  if (!(urlSet instanceof Set)) {
    return null;
  }

  let pendingUrls = pendingSlideImageUrlsByProject.get(urlSet);

  if (!pendingUrls && createIfMissing) {
    pendingUrls = new Set();
    pendingSlideImageUrlsByProject.set(urlSet, pendingUrls);
  }

  return pendingUrls ?? null;
};

const registerPendingSlideImageUrl = function (
  imageUrl,
  urlSet = activeProjectObjectUrls,
) {
  if (!imageUrl) {
    return;
  }

  const pendingUrls = getPendingSlideImageUrls(urlSet, true);

  pendingUrls?.add(imageUrl);
};

const unregisterPendingSlideImageUrl = function (
  imageUrl,
  urlSet = activeProjectObjectUrls,
) {
  if (!imageUrl) {
    return;
  }

  const pendingUrls = getPendingSlideImageUrls(urlSet);

  if (!pendingUrls) {
    return;
  }

  pendingUrls.delete(imageUrl);

  // 空になったら対応関係も解除
  if (pendingUrls.size === 0) {
    pendingSlideImageUrlsByProject.delete(urlSet);
  }
};

const releaseSlideImageUrlIfUnused = function (
  imageUrl,
  { urlSet = activeProjectObjectUrls, excludeSlideState = null } = {},
) {
  if (!imageUrl || !urlSet?.has(imageUrl)) {
    return false;
  }

  // 非同期復元中のURLは解放しない
  const pendingUrls = getPendingSlideImageUrls(urlSet);

  if (pendingUrls?.has(imageUrl)) {
    return false;
  }

  // 既存Slideが使用しているURLは解放しない
  if (isSlideImageUrlInUse(imageUrl, excludeSlideState)) {
    return false;
  }

  revokeOwnedObjectUrl(urlSet, imageUrl);

  return true;
};

// カメラコントロール
const handleWheelForCameraControl = (event) => {
  if (event.target === webglCanvas && event.cancelable) event.preventDefault();
};

const ensureAssetTransform = function (assetConfig) {
  assetConfig.transform ??= {};

  assetConfig.transform.position ??= [0, 0, 0];

  assetConfig.transform.rotation ??= [0, 0, 0, 1];

  assetConfig.transform.scale ??= [1, 1, 1];

  return assetConfig.transform;
};

const setPositionGizmoSnap = function (gizmo, snapDistance) {
  if (!gizmo) {
    return;
  }

  if (gizmo.xGizmo) {
    gizmo.xGizmo.snapDistance = snapDistance;
  }

  if (gizmo.yGizmo) {
    gizmo.yGizmo.snapDistance = snapDistance;
  }

  if (gizmo.zGizmo) {
    gizmo.zGizmo.snapDistance = snapDistance;
  }
};

const setRotationGizmoSnap = function (gizmo, snapDistance) {
  if (!gizmo) {
    return;
  }

  if (gizmo.xGizmo) {
    gizmo.xGizmo.snapDistance = snapDistance;
  }

  if (gizmo.yGizmo) {
    gizmo.yGizmo.snapDistance = snapDistance;
  }

  if (gizmo.zGizmo) {
    gizmo.zGizmo.snapDistance = snapDistance;
  }
};

const setScaleGizmoSnap = function (gizmo, snapDistance) {
  if (!gizmo) {
    return;
  }

  if (gizmo.xGizmo) {
    gizmo.xGizmo.snapDistance = snapDistance;
  }

  if (gizmo.yGizmo) {
    gizmo.yGizmo.snapDistance = snapDistance;
  }

  if (gizmo.zGizmo) {
    gizmo.zGizmo.snapDistance = snapDistance;
  }

  if (gizmo.uniformScaleGizmo) {
    gizmo.uniformScaleGizmo.snapDistance = snapDistance;
  }
};

const isUniformScaleArray = function (scale) {
  if (!Array.isArray(scale) || scale.length < 3) {
    return true;
  }

  const x = Number(scale[0]);

  const y = Number(scale[1]);

  const z = Number(scale[2]);

  const epsilon = 0.000001;

  return Math.abs(x - y) < epsilon && Math.abs(y - z) < epsilon;
};

const historyControlsSlideSelection = function (historyItem) {
  return (
    historyItem.type === "slide-presence-batch" ||
    historyItem.type === "slide-presence" ||
    historyItem.type === "slide-reorder"
  );
};

const isEnvironmentOverrideHistory = function (historyItem) {
  return (
    historyItem.type === "slide-environment-override-batch" ||
    historyItem.type === "slide-environment-override-clear-batch"
  );
};

const isTransitionOverrideHistory = function (historyItem) {
  return (
    historyItem.type === "slide-transition-override-batch" ||
    historyItem.type === "slide-transition-override-clear-batch" ||
    (historyItem.type === "scene1c-override-toggle" && historyItem.key === "transitionOverrideEnabled")
  );
};

const isSoundOverrideHistory = function (historyItem) {
  return (
    historyItem.type === "slide-sound-override-batch" ||
    historyItem.type === "slide-sound-override-clear-batch" ||
    (historyItem.type === "scene1c-override-toggle" && historyItem.key === "soundOverrideEnabled")
  );
};

const isMultiPropertyBatchHistory = function (historyItem) {
  return historyItem.type === "slide-multi-property-batch";
};

const skyboxConfigsEqual = function (a, b) {
  if (!a || !b) {
    return false;
  }

  const faces = ["px", "py", "pz", "nx", "ny", "nz"];

  return faces.every((face) => a[face] === b[face]);
};

const slideTransformHistoryStatesEqual = function (a, b, epsilon = 1e-8) {
  if (!a || !b) {
    return false;
  }

  const vectorEqual = (x, y) =>
    Math.abs(x.x - y.x) < epsilon &&
    Math.abs(x.y - y.y) < epsilon &&
    Math.abs(x.z - y.z) < epsilon;

  const quaternionEqual = (x, y) =>
    Math.abs(x.x - y.x) < epsilon &&
    Math.abs(x.y - y.y) < epsilon &&
    Math.abs(x.z - y.z) < epsilon &&
    Math.abs(x.w - y.w) < epsilon;

  return (
    vectorEqual(a.position, b.position) &&
    quaternionEqual(a.rotationQuaternion, b.rotationQuaternion) &&
    vectorEqual(a.cameraPosition, b.cameraPosition) &&
    quaternionEqual(a.cameraRotation, b.cameraRotation) &&
    // A scale-only edit is still an undoable slide transform.
    Math.abs(normalizeSlideScale(a.slideScale).x - normalizeSlideScale(b.slideScale).x) < epsilon &&
    Math.abs(normalizeSlideScale(a.slideScale).y - normalizeSlideScale(b.slideScale).y) < epsilon &&
    Math.abs(normalizeSlideScale(a.slideScale).z - normalizeSlideScale(b.slideScale).z) < epsilon
  );
};

const isValidSlidePresetProperty = function (propertyName) {
  return (
    propertyName === "scenePreset" ||
    propertyName === "transitionPreset" ||
    propertyName === "soundPreset"
  );
};

const getMultiInspectorFieldDisplayName = function (fieldKey) {
  const names = {
    "environment:useSkybox": "Use Skybox",

    "environment:turbidity": "Turbidity",

    "environment:inclination": "Inclination",

    "environment:azimuth": "Azimuth",

    "environment:fogDensity": "Fog Density",

    "environment:fogColor": "Fog Color",

    "transition:previousSpeed": "Previous Speed",

    "transition:currentSpeed": "Current Speed",

    "transition:nextSpeed": "Next Speed",

    "sound:previous": "Previous Sound",

    "sound:current": "Current Sound",

    "sound:next": "Next Sound",
  };

  return names[fieldKey] ?? fieldKey;
};

const getSlideOverrideObject = function (slideState, group) {
  switch (group) {
    case "environment":
      if (!slideState.environmentOverride) {
        slideState.environmentOverride = {};
      }

      return slideState.environmentOverride;

    case "transition":
      if (!slideState.transitionOverride) {
        slideState.transitionOverride = {};
      }

      return slideState.transitionOverride;

    case "sound":
      if (!slideState.soundOverride) {
        slideState.soundOverride = {};
      }

      return slideState.soundOverride;

    case "bgm":
      if (!slideState.bgmOverride) {
        slideState.bgmOverride = {};
      }

      return slideState.bgmOverride;

    case "autoplay":
      if (!slideState.autoPlayOverride) {
        slideState.autoPlayOverride = {};
      }

      return slideState.autoPlayOverride;

    default:
      return null;
  }
};

const setSectionPendingCount = function (element, count) {
  element.textContent = count > 0 ? `${count} pending` : "";
};

const setMultiFieldState = function (element, state, text = null) {
  if (!element) {
    return;
  }

  element.classList.remove("pending", "mixed", "override", "inherited");

  let displayText = "";

  switch (state) {
    case "pending":
      displayText = text ?? "Pending";

      element.classList.add("pending");

      break;

    case "mixed":
      displayText = text ?? "Mixed";

      element.classList.add("mixed");

      break;

    case "override":
      displayText = text ?? "Override";

      element.classList.add("override");

      break;

    case "inherited":
      displayText = text ?? "Inherited";

      element.classList.add("inherited");

      break;
  }

  element.textContent = displayText;

  element.title = displayText;
};

const formatResolvedTransitionValue = function (value) {
  if (value === undefined || value === null) {
    return "—";
  }

  if (typeof value === "number") {
    return String(Math.round(value * 10000) / 10000);
  }

  return String(value);
};

const formatResolvedSoundValue = function (value) {
  if (value === undefined || value === null || value === "") {
    return "None";
  }

  return String(value);
};

const createSlideCameraHistorySnapshot = function (slideState) {
  return {
    cameraPosition: slideState.cameraPosition.clone(),

    cameraRotation: slideState.cameraRotation.clone(),
  };
};

const setLoadedAssetVisible = function (loadedAsset, visible) {
  for (const mesh of loadedAsset.meshes ?? []) {
    if (mesh && typeof mesh.setEnabled === "function") {
      mesh.setEnabled(visible);
    }
  }
};

const configureAssetGlow = function (loadedAsset, glowLayer) {
  if (!loadedAsset || !glowLayer) {
    return;
  }

  const glowEnabled = loadedAsset.config?.glow ?? false;

  // glow:false のAssetだけ除外
  if (!glowEnabled) {
    for (const mesh of loadedAsset.meshes ?? []) {
      if (mesh) {
        glowLayer.addExcludedMesh(mesh);
      }
    }
  }
};

const getSlideInspectorTargetSignature = function (
  context = getSlideInspectorContext(),
) {
  const ids = context.targetEntries.map(({ slideState }) => slideState.id);

  return `${context.mode}:${ids.join(",")}`;
};

const formatResolvedEnvironmentValue = function (propertyName, value) {
  if (value === undefined || value === null) {
    return "—";
  }

  if (propertyName === "fogColor" && Array.isArray(value)) {
    return colorArrayToHex(value);
  }

  if (typeof value === "boolean") {
    return value ? "On" : "Off";
  }

  if (typeof value === "number") {
    return String(Math.round(value * 10000) / 10000);
  }

  return String(value);
};

const createProjectFileUrl = async function (
  directoryHandle,
  relativePath,
  urlSet,
) {
  if (!(urlSet instanceof Set)) {
    throw new Error("Object URL owner must be a Set.");
  }

  const file = await getProjectFile(directoryHandle, relativePath);

  const url = URL.createObjectURL(file);

  urlSet.add(url);

  return url;
};

const disposePresentationBgmRuntime = function (runtime) {
  if (!runtime) {
    return;
  }

  const audio = runtime.audio;

  runtime.audio = null;

  if (audio) {
    audio.onended = null;
    audio.onerror = null;

    audio.pause();

    audio.removeAttribute("src");

    audio.load();
  }

  revokeObjectUrls(runtime.urls);
};

const getSlideRotationEulerDegrees = function (slideState) {
  const euler = slideState.rotationQuaternion.toEulerAngles();

  return {
    pitch: radiansToDegrees(euler.x),

    yaw: radiansToDegrees(euler.y),

    roll: radiansToDegrees(euler.z),
  };
};

const setScenePresetVisible = function (cachedPreset, visible) {
  if (!cachedPreset) {
    return;
  }

  for (const loadedAsset of cachedPreset.assets) {
    setLoadedAssetVisible(loadedAsset, visible && !(isEditorMode() && scene2oIsAssetHidden([...scenePresetAssetCache].find(([,value]) => value === cachedPreset)?.[0],loadedAsset.config?.id)));
  }
};

const cloneSlideTransformSnapshot = function (snapshot) {
  return {
    position: snapshot.position.clone(),

    rotationQuaternion: snapshot.rotationQuaternion.clone(),

    slideScale: normalizeSlideScale(snapshot.slideScale),

    cameraPosition: snapshot.cameraPosition.clone(),

    cameraRotation: snapshot.cameraRotation.clone(),
  };
};

const createSlideTransformHistorySnapshot = function (slideState) {
  return {
    position: slideState.position.clone(),

    rotationQuaternion: slideState.rotationQuaternion.clone(),

    slideScale: normalizeSlideScale(slideState.slideScale),

    cameraPosition: slideState.cameraPosition.clone(),

    cameraRotation: slideState.cameraRotation.clone(),
  };
};

const applySlideTransformStateToMesh = function (slideState) {
  if (!slideState.mesh) {
    return;
  }

  slideState.mesh.position.copyFrom(slideState.position);

  if (!slideState.mesh.rotationQuaternion) {
    slideState.mesh.rotationQuaternion = slideState.rotationQuaternion.clone();
  } else {
    slideState.mesh.rotationQuaternion.copyFrom(slideState.rotationQuaternion);
  }

  // =====================================
  // Scale
  // =====================================

  const slideScale = normalizeSlideScale(slideState.slideScale);

  slideState.slideScale = slideScale;

  slideState.mesh.scaling.set(slideScale.x, slideScale.y, slideScale.z);
};

const hasSlideBgmOverride = function (slideState) {
  if (!slideState) {
    return false;
  }

  const override = normalizeSlideBgmOverride(slideState.bgmOverride);

  return Object.keys(override).length > 0;
};

const hasSlideAutoPlayOverride = function (slideState) {
  if (!slideState) {
    return false;
  }

  const override = normalizeSlideAutoPlayOverride(slideState.autoPlayOverride);

  return typeof override.intervalSeconds === "number";
};

const createSlideStateFromHistorySnapshot = function (snapshot) {
  return {
    id: snapshot.id,

    label: snapshot.label ?? "",

    imagePath: normalizeSlideImagePath(snapshot.imagePath),
    transparentInPresentation: snapshot.transparentInPresentation === true,

    slideScale: normalizeSlideScale(snapshot.slideScale),

    position: snapshot.position.clone(),

    rotationQuaternion: snapshot.rotationQuaternion.clone(),

    cameraPosition: snapshot.cameraPosition.clone(),

    cameraRotation: snapshot.cameraRotation.clone(),

    scenePreset: snapshot.scenePreset ?? "default",

    environmentOverride: structuredClone(snapshot.environmentOverride ?? {}),
    atmosphereOverrideEnabled: snapshot.atmosphereOverrideEnabled === true,
    atmosphereOverride: snapshot.atmosphereOverride ? normalizeAtmosphereEffects(snapshot.atmosphereOverride) : undefined,

    transitionPreset: snapshot.transitionPreset ?? "default",

    transitionOverride: structuredClone(snapshot.transitionOverride ?? {}),
    transitionOverrideEnabled: snapshot.transitionOverrideEnabled,
    transitionOverrideMode: snapshot.transitionOverrideMode,

    soundPreset: snapshot.soundPreset ?? "default",

    soundOverride: structuredClone(snapshot.soundOverride ?? {}),
    soundOverrideEnabled: snapshot.soundOverrideEnabled,
    soundOverrideMode: snapshot.soundOverrideMode,

    bgmOverride: normalizeSlideBgmOverride(snapshot.bgmOverride),

    autoPlayOverride: normalizeSlideAutoPlayOverride(snapshot.autoPlayOverride),

    interaction: normalizeSlideInteraction(snapshot),
    action: normalizeSlideInteraction(snapshot).type === "open-url" ? normalizeSlideInteraction(snapshot).url : "",

    // Runtime
    imageUrl: null,

    mesh: null,
  };
};

const tryCreateProjectFileUrl = async function (
  directoryHandle,
  relativePath,
  urlSet,
) {
  try {
    return await createProjectFileUrl(directoryHandle, relativePath, urlSet);
  } catch (error) {
    console.warn("Project file not found:", relativePath, error);

    return null;
  }
};

const createSkyboxUrls = async function (
  directoryHandle,
  skyboxConfig,
  objectUrls,
) {
  const paths = [
    skyboxConfig.px,
    skyboxConfig.py,
    skyboxConfig.pz,

    skyboxConfig.nx,
    skyboxConfig.ny,
    skyboxConfig.nz,
  ];

  if (paths.some((path) => typeof path !== "string" || path.length === 0)) {
    throw new Error("Skybox requires px, py, pz, nx, ny and nz.");
  }

  const urls = [];

  try {
    for (const path of paths) {
      const url = await createProjectFileUrl(directoryHandle, path, objectUrls);

      urls.push(url);
    }

    return urls;
  } catch (error) {
    for (const url of urls) {
      revokeOwnedObjectUrl(objectUrls, url);
    }

    throw error;
  }
};

// ============================================================
// 6. Application Logic
// ============================================================
//
// Project / Slide / Scene / Editor / Presentation など、
// アプリケーションの主要ロジック。
// 8Rでは関数の依存順序を維持するため、
// 大規模な並べ替えは行わず、内部を論理Sectionで整理する。

const detectSkyboxSets = function (filenames) {
  const groups = new Map();

  const faces = new Set(["px", "py", "pz", "nx", "ny", "nz"]);

  for (const filename of filenames) {
    // =====================================
    // 例:
    // desert_px.jpg
    // night_nz.png
    // =====================================

    const match = filename.match(
      /^(.+?)_(px|py|pz|nx|ny|nz)\.(jpg|jpeg|png|webp)$/i,
    );

    if (match) {
      const setName = match[1];

      const face = match[2].toLowerCase();

      if (!groups.has(setName)) {
        groups.set(setName, {});
      }

      groups.get(setName)[face] = `skybox/${filename}`;

      continue;
    }

    // =====================================
    // px.jpg / nx.jpg のような
    // prefix無しセットにも対応
    // =====================================

    const bareMatch = filename.match(
      /^(px|py|pz|nx|ny|nz)\.(jpg|jpeg|png|webp)$/i,
    );

    if (bareMatch) {
      const face = bareMatch[1].toLowerCase();

      const setName = "default";

      if (!groups.has(setName)) {
        groups.set(setName, {});
      }

      groups.get(setName)[face] = `skybox/${filename}`;
    }
  }

  const result = [];

  for (const [name, config] of groups) {
    const complete = [...faces].every(
      (face) => typeof config[face] === "string",
    );

    if (!complete) {
      console.warn("Incomplete skybox set:", name, config);

      showAppNotice(`Incomplete skybox set: "${name}"`, {
        level: "warning",
        key: `skybox-load:${name}`,
      });

      continue;
    }

    result.push({
      name: name,

      skybox: {
        px: config.px,
        py: config.py,
        pz: config.pz,
        nx: config.nx,
        ny: config.ny,
        nz: config.nz,
      },
    });
  }

  result.sort((a, b) => a.name.localeCompare(b.name));

  return result;
};

// 回転
const rotateCameraLocal = function (yawDeg = 0, pitchDeg = 0, rollDeg = 0) {
  if (!camera || !camera.rotationQuaternion) {
    return;
  }

  const deltaRotation = Quaternion.RotationYawPitchRoll(
    degToRad(yawDeg),
    degToRad(pitchDeg),
    degToRad(rollDeg),
  );

  camera.rotationQuaternion = camera.rotationQuaternion
    .multiply(deltaRotation)
    .normalize();

  // 手動操作後の状態を
  // アニメーション側にも同期
  cameraCurrentRotation = camera.rotationQuaternion.clone();
  cameraEndPointRotation = camera.rotationQuaternion.clone();

  cameraCurrentPosition = camera.position.clone();
  cameraEndPointPosition = camera.position.clone();

  // 自動スライド遷移を止めて
  // 現在姿勢を維持
  cameraControlViaKeyboard = false;
};

const cameraPoseToQuaternion = function (position, target, upVector) {
  const forward = target.subtract(position);
  if (forward.lengthSquared() < 1e-12) {
    return Quaternion.Identity();
  }
  forward.normalize();

  let up = upVector.clone();
  if (up.lengthSquared() < 1e-12) {
    up = Vector3.Up();
  }
  up.normalize();

  // forward と up が完全に平行に近い場合の保険
  if (Math.abs(Vector3.Dot(forward, up)) > 0.9999) {
    up = Math.abs(forward.y) < 0.9 ? Vector3.Up() : Vector3.Right();
  }

  // forwardに直交するupを作り直す
  const right = Vector3.Cross(up, forward).normalize();
  const correctedUp = Vector3.Cross(forward, right).normalize();

  return Quaternion.FromLookDirectionLH(forward, correctedUp).normalize();
};

const getCurrentSceneState = function () {
  return {
    meshFile: mainMeshPath ? mainMeshPath.split("/").pop() : "",
    spzFile: spzPath ? spzPath.split("/").pop() : "",
    environment: {
      useSkybox: useSkybox,
      turbidity: Number(turbidity),
      inclination: Number(inclination),
      azimuth: Number(azimuth),
      fogColor: fogColor.clone(),
      fogDensity: Number(fogDensity),
    },
  };
};

const vector3FromArray = function (value, defaultValue = [0, 0, 0]) {
  const a = Array.isArray(value) ? value : defaultValue;

  return new Vector3(
    Number(a[0] ?? defaultValue[0]),

    Number(a[1] ?? defaultValue[1]),

    Number(a[2] ?? defaultValue[2]),
  );
};

const quaternionFromArray = function (value, defaultValue = [0, 0, 0, 1]) {
  const a = Array.isArray(value) ? value : defaultValue;

  return new Quaternion(
    Number(a[0] ?? defaultValue[0]),

    Number(a[1] ?? defaultValue[1]),

    Number(a[2] ?? defaultValue[2]),

    Number(a[3] ?? defaultValue[3]),
  ).normalize();
};

const applyAssetTransform = function (node, assetConfig) {
  const transform = assetConfig?.transform ?? {};

  const position = vector3FromArray(transform.position, [0, 0, 0]);

  const rotation = quaternionFromArray(transform.rotation, [0, 0, 0, 1]);

  const scale = vector3FromArray(transform.scale, [1, 1, 1]);

  node.position.copyFrom(position);

  node.rotationQuaternion = rotation.clone();

  node.scaling.copyFrom(scale);
};

const getScenePresetConfigByName = function (presetName) {
  return currentProjectData?.scenePresets?.[presetName] ?? null;
};

const recordSlideLabelHistory = function (slideState, before, after) {
  if (!slideState) {
    return;
  }

  const beforeLabel = String(before ?? "");

  const afterLabel = String(after ?? "");

  if (beforeLabel === afterLabel) {
    return;
  }

  pushEditorHistory({
    type: "slide-label",

    slideId: slideState.id,

    before: beforeLabel,

    after: afterLabel,
  });
};

const refreshMultiFieldStateByKey = function (fieldKey) {
  switch (fieldKey) {
    case "environment:useSkybox":
      refreshMultiEnvironmentFieldState(multiUseSkyboxState, "useSkybox");

      break;

    case "environment:turbidity":
      refreshMultiEnvironmentFieldState(multiTurbidityState, "turbidity");

      break;

    case "environment:inclination":
      refreshMultiEnvironmentFieldState(multiInclinationState, "inclination");

      break;

    case "environment:azimuth":
      refreshMultiEnvironmentFieldState(multiAzimuthState, "azimuth");

      break;

    case "environment:fogDensity":
      refreshMultiEnvironmentFieldState(multiFogDensityState, "fogDensity");

      break;

    case "environment:fogColor":
      refreshMultiEnvironmentFieldState(multiFogColorState, "fogColor");

      break;

    case "transition:previousSpeed":
      refreshMultiTransitionFieldState(
        multiPreviousSpeedState,
        "previousSpeed",
      );

      break;

    case "transition:currentSpeed":
      refreshMultiTransitionFieldState(multiCurrentSpeedState, "currentSpeed");

      break;

    case "transition:nextSpeed":
      refreshMultiTransitionFieldState(multiNextSpeedState, "nextSpeed");

      break;

    case "sound:previous":
      refreshMultiSoundFieldState(multiPreviousSoundState, "previous");

      break;

    case "sound:current":
      refreshMultiSoundFieldState(multiCurrentSoundState, "current");

      break;

    case "sound:next":
      refreshMultiSoundFieldState(multiNextSoundState, "next");

      break;
  }
};

const markMultiInspectorFieldDirty = function (fieldKey) {
  dirtyMultiInspectorFields.add(fieldKey);

  refreshMultiPendingUi();

  refreshMultiFieldStateByKey(fieldKey);
};

const clearMultiInspectorFieldDirty = function (fieldKey) {
  dirtyMultiInspectorFields.delete(fieldKey);

  refreshMultiPendingUi();
};

const isMultiInspectorFieldDirty = function (fieldKey) {
  return dirtyMultiInspectorFields.has(fieldKey);
};

// ============================================================
// 6A. Core Editor Runtime
// ============================================================
//
// Editorの基本UI・Slide適用・Navigation・Camera・
// Drawing・Screenshot・Project Audioなど、
// 日常的なEditor操作のruntime処理。

const syncEnvironmentUi = function (environment) {
  if (!environment) {
    return;
  }

  const resolvedTurbidity = Number(environment.turbidity ?? 10);

  const resolvedInclination = Number(environment.inclination ?? 0);

  const resolvedAzimuth = Number(environment.azimuth ?? 0.5);

  const resolvedFogDensity = Number(environment.fogDensity ?? 0.002);

  // The rendered environment may be a Slide override even while the user is
  // editing a Scene preset. Never use the rendered values to overwrite the
  // shared editor, or interrupt a focused slider/number gesture.
  for (const [key, value, slider, readout] of [
    ["turbidity", resolvedTurbidity, turbiditySlider, turbidityValue],
    ["inclination", resolvedInclination, inclinationSlider, inclinationValue],
    ["azimuth", resolvedAzimuth, azimuthSlider, azimuthValue],
    ["fogDensity", resolvedFogDensity, fogDensitySlider, fogDensityValue],
  ]) {
    const number = document.getElementById(`${key}Number`);
    if (document.activeElement !== slider && document.activeElement !== number) {
      slider.value = String(value);
      readout.textContent = String(value);
    }
    if (number && document.activeElement !== number && document.activeElement !== slider) {
      number.value = String(value);
    }
  }

  fogColorPicker.value = colorArrayToHex(environment.fogColor);
  if (typeof syncSkyModeControls === "function") syncSkyModeControls();
};

// ボタンなどの音声
const resolveSoundAssetPath = function (soundId) {
  if (!soundId || soundId === "NONE") {
    return null;
  }

  const path = currentProjectData?.audioAssets?.[soundId]?.path ?? currentProjectData?.soundAssets?.[soundId];

  if (!path) {
    console.warn("Sound asset is not defined:", soundId);

    return null;
  }

  return path;
};

const getProjectAudio = async function (soundId) {
  if (!soundId || soundId === "NONE") {
    return null;
  }

  // =============================
  // Cache
  // =============================

  if (projectAudioCache.has(soundId)) {
    return projectAudioCache.get(soundId);
  }

  // =============================
  // Project Folder未選択
  // =============================

  if (!currentProjectDirectoryHandle) {
    console.warn(
      "Sound cannot be loaded because " + "no project folder is selected:",
      soundId,
    );

    return null;
  }

  // =============================
  // File path
  // =============================

  const relativePath = resolveSoundAssetPath(soundId);

  if (!relativePath) {
    return null;
  }

  // =============================
  // File → Blob URL
  // =============================

  const url = await createProjectFileUrl(
    currentProjectDirectoryHandle,
    relativePath,
    activeProjectObjectUrls,
  );

  // =============================
  // Audio
  // =============================

  const audio = new Audio(url);

  audio.preload = "auto";

  // =============================
  // Cache
  // =============================

  projectAudioCache.set(soundId, audio);

  return audio;
};

const playButtonAudio = function (soundId) {
  if (!soundId || soundId === "NONE") {
    return;
  }

  getProjectAudio(soundId)
    .then((audio) => {
      if (!audio) {
        return;
      }

      audio.currentTime = 0;

      return audio.play();
    })
    .catch((error) => {
      console.warn("Audio playback failed:", soundId, error);
    });
};

const safePlayButtonAudio = async function (soundId) {
  if (!soundId) {
    return false;
  }

  try {
    await playButtonAudio(soundId);

    return true;
  } catch (error) {
    console.warn("Button audio failed:", soundId, error);

    return false;
  }
};

const clearProjectAudioCache = function () {
  stopPresentationBgm();

  for (const audio of projectAudioCache.values()) {
    try {
      audio.pause();

      audio.currentTime = 0;
    } catch {
      // 何もしない
    }
  }

  projectAudioCache.clear();
};

// Scene-4D: keep the interaction control tied to presentation mode and current Slide.
const interactionForCurrentSlide = () => {
  const interaction = normalizeSlideInteraction(getCurrentSlideState());
  if (interaction.type === 'open-url') return safeInteractionUrl(interaction.url) ? interaction : null;
  if (interaction.type === 'local-web') return currentProjectDirectoryHandle && safeLocalWebPath(interaction.url) ? interaction : null;
  return null;
};

const openSlideInteraction = async (interaction) => {
  // Open synchronously in the click gesture, before awaiting any filesystem work.
  // Browsers often block new windows opened only after an async operation.
  const tab = window.open('about:blank', '_blank');
  if (!tab) { showAppNotice(t('Popup was blocked'), {level:'error'}); return; }
  try {
    let target;
    if (interaction.type === 'local-web') {
      target = await createLocalWebPageUrl(currentProjectDirectoryHandle, interaction.url);
    } else {
      target = safeInteractionUrl(interaction.url);
    }
    if (!target) throw new Error('Invalid interaction target');
    tab.opener = null;
    tab.location.replace(target);
  } catch (error) {
    console.warn('Interaction open failed', error);
    tab.close();
    showAppNotice(t('Cannot open local web page'), {level:'error'});
  }
};

let interactionButtonHovered = false;
let attachedTextActionButton;
const attachedTextForCurrentSlide = () => normalizeSlideInteraction(getCurrentSlideState()).text || '';
const refreshInteractionButtonVisual = () => {
  if (!actionPanel) return;
  const style = getComputedStyle(document.documentElement);
  const get = (key, fallback) => style.getPropertyValue(key).trim() || fallback;
  for (const button of [actionButton, attachedTextActionButton]) {
    if (!button) continue;
    button.background = get('--ui-surface-toolbar', '#28333f');
    button.color = get('--ui-text', '#fff');
    button.thickness = 1;
    button.cornerRadius = 9;
    button.fontSize = 14;
    button.fontWeight = '500';
    button.borderColor = get('--ui-border', '#607080');
  }
  actionPanel.alpha = !isPresentationMode() || presentationOverlay?.hidden ? 0
    : presentationOverlay?.classList.contains('idle') && !interactionButtonHovered ? 0.18 : 1;
  actionPanel.isVisible = isPresentationMode();
};

const switchAction = function () {
  disposeAction();
  const interaction = interactionForCurrentSlide();
  const hasText = !!attachedTextForCurrentSlide();
  if ((interaction || hasText) && isPresentationMode() && actionUiTexture) createAction(interaction, hasText);
};

const createAction = function (interaction, hasText) {
  actionPanel = new StackPanel();
  actionPanel.isVertical = true;
  actionPanel.width = '214px';
  actionPanel.height = hasText && interaction ? '104px' : '56px';
  actionPanel.background = 'transparent';
  actionPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  actionPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  actionPanel.paddingRight = '12px';
  actionUiTexture.addControl(actionPanel);
  const createButton = (id, label, callback) => {
    const button = Button.CreateSimpleButton(id, t(label));
    button.width = '188px';
    button.height = '40px';
    button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    button.paddingTop = '0px';
    button.paddingBottom = '6px';
    button.onPointerEnterObservable.add(() => { interactionButtonHovered = true; refreshInteractionButtonVisual(); });
    button.onPointerOutObservable.add(() => { interactionButtonHovered = false; refreshInteractionButtonVisual(); });
    button.onPointerUpObservable.add(callback);
    actionPanel.addControl(button);
    return button;
  };
  if (interaction) actionButton = createButton('interactionOpenUrl', interaction.type === 'local-web' ? 'Open local page' : 'Open URL', () => {
    const current = interactionForCurrentSlide();
    if (current && isPresentationMode()) void openSlideInteraction(current);
  });
  if (hasText) attachedTextActionButton = createButton('interactionViewText', 'View attached text', () => {
    if (isPresentationMode()) openSlideTextViewer();
  });
  refreshInteractionButtonVisual();
};

const disposeAction = function () {
  interactionButtonHovered = false;
  if (actionButton) { actionButton.dispose(); actionButton = undefined; }
  if (attachedTextActionButton) { attachedTextActionButton.dispose(); attachedTextActionButton = undefined; }
  if (actionPanel) { actionPanel.dispose(); actionPanel = undefined; }
};

const applyCurrentSlideEditorState = async function () {
  const slideState = getCurrentSlideState();

  if (!slideState) {
    refreshCurrentSlideEditorUi();

    return false;
  }

  await applyCurrentSlideSceneState();

  refreshCurrentSlideEditorUi();

  return true;
};

const applyCurrentSlideSceneState = async function () {
  const slideState = getCurrentSlideState();

  if (!slideState) {
    return false;
  }

  // =====================================
  // Scene Preset
  // =====================================

  await activateScenePreset(slideState);

  // =====================================
  // Environment
  // =====================================

  await applyCurrentEnvironment();

  return true;
};

const refreshSlideNavigationIndicator = function () {
  currentSlidePage.textContent = String(currentSlideIndex >= 0 ? currentSlideIndex + 1 : 0);

  if (isEditorMode()) {
    renderTable();
  }
};

const previousSlide = async function () {
  return await navigateSlide(SLIDE_NAV_PREVIOUS);
};

const currentSlide = async function () {
  return await navigateSlide(SLIDE_NAV_CURRENT);
};

const nextSlide = async function () {
  return await navigateSlide(SLIDE_NAV_NEXT);
};

const ensureCameraNavigation = function () {
  if (cameraNavigation) return cameraNavigation;
  cameraNavigation = createCameraNavigation({
    canvas: webglCanvas,
    getCamera: () => camera,
    getOrbitTarget: () => getCurrentSlideState()?.mesh?.getAbsolutePosition()?.clone() ?? null,
    Vector3, Quaternion,
    onPoseChanged: () => {
      if (!camera) return;
      cameraControlViaKeyboard = false;
      cameraCurrentPosition = camera.position.clone();
      cameraEndPointPosition = camera.position.clone();
      cameraCurrentRotation = (camera.rotationQuaternion ?? Quaternion.Identity()).clone();
      cameraEndPointRotation = cameraCurrentRotation.clone();
    }
  });
  cameraNavigation.setSettings(cameraNavigationSettings);
  cameraNavigation.setRotationMode(cameraNavigationSettings.rotationMode);
  return cameraNavigation;
};
const attachCameraControl = function () {
  applyButtonEffect(cameraControlButton);
  void uiSound.play();
  if (drawingController.isActive()) detachDrawings();
  cameraControlViaMouse = true;
  cameraControlViaKeyboard = false;
  cameraControlStatus.textContent = t('停止');
  // Built-in mouse rotation is disabled: Camera-1 owns pointer events.
  camera.detachControl();
  ensureCameraNavigation().start();
  cameraControlButton.classList.add('active');
  if (isPresentationMode()) updatePresentationCameraButton();
};
const detachCameraControl = function () {
  applyButtonEffect(cameraControlButton);
  void uiSound.play();
  cameraControlViaMouse = false;
  cameraControlStatus.textContent = t('開始');
  cameraNavigation?.stop();
  camera.detachControl();
  cameraControlButton.classList.remove('active');
  if (isPresentationMode()) updatePresentationCameraButton();
};

const switchCameraControl = function () {
  if (cameraControlViaMouse) {
    detachCameraControl();
  } else {
    attachCameraControl();
  }
};

// Camera-2C: derive the header state from the browser fullscreen state,
// including Escape and browser-initiated exits (not only button clicks).
const refreshEditorFullscreenButton = function () {
  const isFullscreen = Boolean(document.fullscreenElement);
  fullscreenStatus.textContent = isFullscreen ? "停止" : "開始";
  fullscreenStatus.setAttribute("data-i18n", isFullscreen ? "停止" : "開始");
  fullscreenButton.classList.toggle("active", isFullscreen);
  fullscreenButton.setAttribute("aria-pressed", String(isFullscreen));
};
const toggleFullscreen = async function () {
  applyButtonEffect(fullscreenButton);
  void uiSound.play();
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch (error) {
    console.error("Fullscreen toggle failed:", error);
  } finally {
    refreshEditorFullscreenButton();
  }
};

// スクリーンショットボタン
const saveScreenshot = function () {
  applyButtonEffect(screenshotButton);
  void uiSound.play();
  Tools.CreateScreenshot(engine, camera, { precision: 1.0 }, (babyPng) => {
    const babyImg = new Image();
    babyImg.src = babyPng; // "data:image/png;base64," + base64Data;

    babyImg.onload = function () {
      const mCanvas = document.createElement("canvas");
      const mCtx = mCanvas.getContext("2d");

      mCanvas.width = webglCanvas.width;
      mCanvas.height = webglCanvas.height;

      mCtx.drawImage(babyImg, 0, 0);
      mCtx.drawImage(standardDrawingCanvas, 0, 0);
      mCtx.drawImage(neonDrawingCanvas, 0, 0);
      const mDataUrl = mCanvas.toDataURL("image/png");

      const filename = "drawing-" + getTimeStamp() + `.png`;

      const link = document.createElement("a");
      link.href = mDataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // サムネイルを作成して表示
      const thumbnail = document.createElement("img");
      thumbnail.src = mDataUrl;
      thumbnail.className = "thumbnail";
      thumbnail.alt = `Screenshot ${filename}`;
    };
  });
};

// Editor and presentation share one tool state; quick buttons allow one-click selection.
function updateDrawingSelectionButtons() {
  const activeSelection = drawingTargetSelect?.value === "screen" ? drawingController?.getScreenSelection() : slideDrawing?.getSelection();
  const hasSelection = Boolean(activeSelection);
  const actions = document.getElementById("drawingSelectedActions");
  if (actions) actions.classList.toggle("has-selection", hasSelection);
  const status = document.getElementById("drawingSelectedStatus");
  if (status) status.textContent = activeSelection ? `${activeSelection.strokeId ?? `Screen stroke ${activeSelection.index + 1}`} (${activeSelection.count || 1})` : t("線が選択されていません");
  for (const id of ["drawingApplySelected", "drawingDeleteSelected", "drawingDeselectSelected", "drawingCopyStrokes", "drawingRotateStrokes", "drawingScaleStrokes"]) {
    const button = document.getElementById(id);
    if (button) button.disabled = !hasSelection;
  }
}

let currentSlideDrawingTool = "brush";
let drawingEraserMode = "partial";
// Eraser diameter follows the selected pen width (no separate size setting).
// Both the screen and slide controllers use this common radius in pixels.
const getDrawingEraserRadius = () => Math.max(4, Number(document.querySelector(".line-width-option.selected")?.getAttribute("data-width") || 9) * 1.25);
document.getElementById("drawingEraserMode")?.addEventListener("change", e => {
  drawingEraserMode = e.target.value === "partial" ? "partial" : "stroke";
  slideDrawing?.clearSelection(); drawingController?.clearScreenSelection(); uiSound.play();
});
function setSlideDrawingTool(tool) {
  if (!["brush", "select", "eraser"].includes(tool)) return;
  if (currentSlideDrawingTool === "select" && tool !== "select") {
    slideDrawing?.clearSelection();
    drawingController?.clearScreenSelection();
  }
  currentSlideDrawingTool = tool;
  document.querySelectorAll(".drawing-tool-quick-button").forEach(button => {
    const active = button.dataset.tool === tool;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  ["presentationToolBrush", "presentationToolEraser"].forEach((id, index) => {
    document.getElementById(id)?.setAttribute("aria-pressed", String(tool === (index ? "eraser" : "brush")));
  });
  slideDrawing?.refreshAll();
  drawingController?.refreshScreenLayerOrder();
}
document.querySelectorAll(".drawing-tool-quick-button").forEach(button => button.addEventListener("click", () => { setSlideDrawingTool(button.dataset.tool); uiSound.play(); }));
// Drawing-7F3: an inactive session must never keep selected strokes or a stale tool.
// The drawingController handler is registered during setup; defer this observer to
// the end of the click dispatch so the new active state is already available.
drawingButton?.addEventListener("click", () => {
  queueMicrotask(() => {
    slideDrawing?.clearSelection();
    drawingController?.clearScreenSelection();
    setSlideDrawingTool("brush");
    updateDrawingSelectionButtons();
  });
});
// Slide-local standard drawing persists; transient neon strokes fade without saving.
const drawingPenOpacity = document.getElementById("drawingPenOpacity");
const presentationPenOpacity = document.getElementById("presentationPenOpacity");
function setDrawingOpacity(value) {
  const normalized = Math.max(5, Math.min(100, Number(value) || 100));
  for (const input of [drawingPenOpacity, presentationPenOpacity]) if (input) input.value = String(normalized);
  for (const id of ["drawingPenOpacityValue", "presentationPenOpacityValue"]) {
    const output = document.getElementById(id); if (output) output.textContent = `${normalized}%`;
  }
}
function getDrawingStrokeColor() {
  const selected = document.querySelector(".color-option.selected")?.getAttribute("data-color") || "#ff0000";
  return strokeColorWithOpacity(selected, (Number(drawingPenOpacity?.value) || 100) / 100);
}
for (const input of [drawingPenOpacity, presentationPenOpacity]) {
  input?.addEventListener("input", () => setDrawingOpacity(input.value));
  input?.addEventListener("change", () => uiSound.play());
}
setDrawingOpacity(100);

const slideDrawing = createSlideDrawingController({
  getScene: () => scene,
  getSlides: () => slideStates,
  getTool: () => currentSlideDrawingTool,
  getDragMode: () => document.getElementById("drawingDragMode")?.value || "move",
  getEraserMode: () => drawingEraserMode,
  getEraserRadius: getDrawingEraserRadius,
  onSelectionChanged: selection => {
    const el = document.getElementById("drawingSelectedStatus");
    if (el) el.textContent = selection ? `${selection.strokeId} (${selection.count || 1})` : t("線が選択されていません");
    updateDrawingSelectionButtons();
  },
  getCanvas: () => document.getElementById("webglCanvas"),
  getColor: () => getDrawingStrokeColor(),
  getWidth: () => Number(document.querySelector(".line-width-option.selected")?.getAttribute("data-width") || 5),
  getGlowLayer: () => activeGlowLayer,
  getStyle: () => layerSwitch.checked ? "neon" : "standard",
  getFadeSeconds: () => Number(fadeTimeInput.value) || 3,
  getGlowStrength: () => Number(slideNeonGlowStrength?.value) || 1,
  onStrokeCommitted: ({slideId, before, after}) => {
    renderSlideThumbnails();
    if (presentationDrawingSnapshot) recordPresentationDrawingHistory({type: "slide", changes: [{slideId, before, after}]});
    else {
      pushEditorHistory({type: "slide-drawing", changes: [{slideId, before, after}]});
      scheduleProjectStatusRefresh();
    }
  },
  onClearCommitted: changes => {
    renderSlideThumbnails();
    if (presentationDrawingSnapshot) recordPresentationDrawingHistory({type: "slide", changes});
    else {
      pushEditorHistory({type: "slide-drawing", changes});
      scheduleProjectStatusRefresh();
    }
  },
});
document.getElementById("clearScreenDrawingsButton")?.addEventListener("click", () => { drawingController.clearScreenDrawings(); updateDrawingSelectionButtons(); uiSound.play(); });
document.getElementById("clearSelectedSlideDrawingsButton")?.addEventListener("click", () => {
  if (slideDrawing.clearSelected([...selectedSlideIds])) { renderSlideThumbnails(); uiSound.play(); scheduleProjectStatusRefresh(); }
});
// Drawing-5: edit complete slide strokes; each operation uses the Drawing-2 history entry.
document.getElementById("standardDrawingCanvas")?.addEventListener("pointerdown", () => queueMicrotask(updateDrawingSelectionButtons));
document.getElementById("drawingTargetSelect")?.addEventListener("change", updateDrawingSelectionButtons);
document.getElementById("drawingDeselectSelected")?.addEventListener("click", () => {
  slideDrawing.clearSelection(); drawingController.clearScreenSelection();
  updateDrawingSelectionButtons(); uiSound.play();
});
document.getElementById("drawingDeleteSelected")?.addEventListener("click", () => {
  if (drawingTargetSelect?.value === "screen") {
    if (drawingController.deleteScreenSelection()) uiSound.play();
    updateDrawingSelectionButtons(); return;
  }
  if (slideDrawing.deleteSelected()) { renderSlideThumbnails(); uiSound.play(); scheduleProjectStatusRefresh(); }
});
document.getElementById("drawingApplySelected")?.addEventListener("click", () => {
  if (drawingTargetSelect?.value === "screen") {
    if (drawingController.updateScreenSelection({
      color: document.querySelector(".color-option.selected")?.dataset.color,
      width: document.querySelector(".line-width-option.selected")?.dataset.width
    })) uiSound.play();
    updateDrawingSelectionButtons(); return;
  }
  if (slideDrawing.updateSelected({
    color: document.querySelector(".color-option.selected")?.dataset.color,
    width: document.querySelector(".line-width-option.selected")?.dataset.width
  })) { renderSlideThumbnails(); uiSound.play(); scheduleProjectStatusRefresh(); }
});
// Drawing-7C clipboard is separate from the slide/asset clipboard.
let drawingStrokeClipboard = null;
function copyDrawingSelection() {
  const screen=drawingTargetSelect?.value==="screen";
  const strokes=screen ? drawingController.copyScreenSelection() : slideDrawing.copySelection();
  if(!strokes?.length)return false;
  drawingStrokeClipboard={target:screen?"screen":"slide",strokes};
  document.getElementById("drawingPasteStrokes").disabled=false;
  uiSound.play();return true;
}
function pasteDrawingSelection() {
  if(!drawingStrokeClipboard || drawingStrokeClipboard.target!==drawingTargetSelect?.value)return false;
  const result=drawingStrokeClipboard.target==="screen" ? drawingController.pasteScreenSelection(drawingStrokeClipboard.strokes) : slideDrawing.pasteSelection(drawingStrokeClipboard.strokes);
  if(result){updateDrawingSelectionButtons();renderSlideThumbnails();scheduleProjectStatusRefresh();uiSound.play();}
  return result;
}
function transformDrawingSelection(kind) {
  const input=document.getElementById(kind==="rotate"?"drawingStrokeAngle":"drawingStrokeScale");
  const value=Number(input?.value);
  if (!Number.isFinite(value) || (kind==="scale" && (value<=0 || value>10))) return;
  const options=kind==="rotate"?{angleDeg:value}:{scale:value};
  const screen=drawingTargetSelect?.value==="screen";
  const success=screen?drawingController.transformScreenSelection(options):slideDrawing.transformSelection(options);
  if(success){updateDrawingSelectionButtons();renderSlideThumbnails();scheduleProjectStatusRefresh();uiSound.play();}
}
document.getElementById("drawingRotateStrokes")?.addEventListener("click",()=>transformDrawingSelection("rotate"));
document.getElementById("drawingScaleStrokes")?.addEventListener("click",()=>transformDrawingSelection("scale"));
document.getElementById("drawingCopyStrokes")?.addEventListener("click",copyDrawingSelection);
document.getElementById("drawingPasteStrokes")?.addEventListener("click",pasteDrawingSelection);
const paletteSwatches = Array.from(document.querySelectorAll(".color-option"));
const paletteDefaults = paletteSwatches.map(el => el.dataset.color);
const paletteKey = "slidespace-drawing-palette-v1";
function updateDrawingPalette(colors) {
  paletteSwatches.forEach((el,i) => {
    if (!colors[i]) return;
    el.dataset.color = colors[i]; el.style.backgroundColor = colors[i];
  });
  // Also update the presentation palette without changing the selected brush.
  const picker = document.getElementById("presentationBrushColor");
  if (picker) {
    const previous = picker.value;
    picker.replaceChildren(...paletteSwatches.map((el,i) => new Option(String(i+1), el.dataset.color)));
    picker.value = paletteSwatches.some(el => el.dataset.color === previous) ? previous :
      document.querySelector(".color-option.selected")?.dataset.color;
  }
}
try {
  const saved = JSON.parse(localStorage.getItem(paletteKey) || "null");
  if (Array.isArray(saved) && saved.length === paletteSwatches.length && saved.every(x => typeof x === "string" && /^#[0-9a-f]{6}$/i.test(x))) updateDrawingPalette(saved);
} catch { /* Storage access may be restricted. */ }
// Palette presets are browser-local preferences, not project-stroke history.
// Maintain a separate, reversible history so an accidental Apply is recoverable.
const paletteUndoStack = [];
const paletteRedoStack = [];
function getPaletteSnapshot() { return paletteSwatches.map(el => el.dataset.color); }
function updatePaletteHistoryUi() {
  const undo = document.getElementById("drawingPaletteUndo");
  const redo = document.getElementById("drawingPaletteRedo");
  if (undo) undo.disabled = paletteUndoStack.length === 0;
  if (redo) redo.disabled = paletteRedoStack.length === 0;
}
function restorePaletteSnapshot(colors) {
  updateDrawingPalette(colors);
  document.querySelector(".color-option.selected")?.click();
  try { localStorage.setItem(paletteKey, JSON.stringify(getPaletteSnapshot())); } catch {}
  renderPresentationQuickColors();
  syncPresentationBrushPalette();
  updatePaletteHistoryUi();
}
document.getElementById("drawingPaletteUndo")?.addEventListener("click", () => {
  const previous=paletteUndoStack.pop(); if (!previous) return;
  paletteRedoStack.push(getPaletteSnapshot()); restorePaletteSnapshot(previous); uiSound.play();
});
document.getElementById("drawingPaletteRedo")?.addEventListener("click", () => {
  const next=paletteRedoStack.pop(); if (!next) return;
  paletteUndoStack.push(getPaletteSnapshot()); restorePaletteSnapshot(next); uiSound.play();
});
document.getElementById("drawingPaletteApply")?.addEventListener("click", () => {
  const idx = Number(document.getElementById("drawingPaletteSlot")?.value);
  const color = document.getElementById("drawingPaletteColor")?.value;
  if (!Number.isInteger(idx) || !paletteSwatches[idx] || !/^#[0-9a-f]{6}$/i.test(color)) return;
  const swatch = paletteSwatches[idx];
  const wasSelected = swatch.classList.contains("selected");
  if (swatch.dataset.color.toLowerCase() === color.toLowerCase()) return;
  paletteUndoStack.push(getPaletteSnapshot()); paletteRedoStack.length = 0;
  updatePaletteHistoryUi();
  updateDrawingPalette(paletteSwatches.map((el,i) => i === idx ? color : el.dataset.color));
  if (wasSelected) swatch.click();
  try { localStorage.setItem(paletteKey, JSON.stringify(paletteSwatches.map(el => el.dataset.color))); } catch {}
  uiSound.play();
});
document.getElementById("drawingPaletteReset")?.addEventListener("click", () => {
  if (getPaletteSnapshot().some((x,i)=>x !== paletteDefaults[i])) { paletteUndoStack.push(getPaletteSnapshot()); paletteRedoStack.length = 0; updatePaletteHistoryUi(); }
  updateDrawingPalette(paletteDefaults);
  document.querySelector(".color-option.selected")?.click();
  try { localStorage.removeItem(paletteKey); } catch {}
  uiSound.play();
});
// Selection feedback is a rendering overlay, not part of serialized strokes.
// Repaint only while a selection exists.
window.setInterval(() => {
  if (isPresentationMode()) return;
  if (!slideDrawing.getSelection() && !drawingController.getScreenSelection()) return;
  const alpha = 0.38 + 0.62 * (0.5 + 0.5 * Math.sin(performance.now() / 230));
  slideDrawing.setHighlightPulse(alpha);
  drawingController.setSelectionPulse(alpha);
}, 90);

// 手描き機能の生成と接続
const drawingController = createDrawingController({
  neonDrawingCanvas,
  standardDrawingCanvas,
  neonDrawingCtx,
  standardDrawingCtx,
  drawingButton,
  drawingStatus,
  layerSwitch,
  layerSwitchLabel,
  colorOptions,
  lineWidthOptions,
  fadeTimeInput,
  clearDrawingsButton,
  getPointerPos,
  applyButtonEffect,
  safePlayButtonAudio: () => uiSound.play(),
  detachCameraControl,
  isCameraControlViaMouse: () => cameraControlViaMouse,
  slideDrawing,
  drawingTargetSelect,
  getSlideTool: () => currentSlideDrawingTool,
  getStrokeColor: () => getDrawingStrokeColor(),
  getDragMode: () => document.getElementById("drawingDragMode")?.value || "move",
  getEraserMode: () => drawingEraserMode,
  getEraserRadius: getDrawingEraserRadius,
  onScreenSelectionChanged: () => queueMicrotask(updateDrawingSelectionButtons),
  onScreenHistory: change => { if (!recordPresentationDrawingHistory({type: "screen", ...change})) pushEditorHistory({type: "screen-drawing", ...change}); },
});

const {
  resizeCanvas,
  detachDrawings,
  switchDrawing,
  toggleActiveLayer,
  clearDrawings,
} = drawingController;

// テーブルにデータをレンダリングする関数
const renderTable = function () {
  ensureCurrentSlideSelected();
  projectStatus.refresh();
  const precision = 4;
  const tableBody = document.getElementById("tableBody");
  tableBody.innerHTML = "";
  slideStates.forEach((slideState, index) => {
    const euler = slideState.rotationQuaternion.toEulerAngles();
    const pitch = (euler.x * 180) / Math.PI;
    const yaw = (euler.y * 180) / Math.PI;
    const roll = (euler.z * 180) / Math.PI;
    const hasTransitionOverride =
      Object.keys(slideState.transitionOverride ?? {}).length > 0;
    const hasSoundOverride =
      Object.keys(slideState.soundOverride ?? {}).length > 0;
    const row = document.createElement("tr");

    const values = [
      slideState.id, slideState.imagePath ?? "—", slideState.label ?? "",
      slideState.position.x.toFixed(precision), slideState.position.y.toFixed(precision), slideState.position.z.toFixed(precision),
      pitch.toFixed(precision), yaw.toFixed(precision), roll.toFixed(precision),
      slideState.scenePreset ?? "default",
      `${slideState.transitionPreset ?? "default"}${hasTransitionOverride ? "*" : ""}`,
      `${slideState.soundPreset ?? "default"}${hasSoundOverride ? "*" : ""}`,
      slideState.action ?? "",
    ];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.appendChild(cell);
    }

    // =============================
    // 行クリックでSlide選択
    // =============================
    if (index === currentSlideIndex) {
      row.classList.add("current-slide-row");
    }
    row.addEventListener("click", async (event) => {
      if (event.target.closest("button, input, select")) {
        return;
      }
      await selectSlideByIndex(index);
    });

    tableBody.appendChild(row);
  });
};

// ============================================================
// 6B. Editor Data / Scene Asset Runtime
// ============================================================
//
// Slideの記録・保存データ生成・Preset / Override編集・
// Scene Asset編集・Asset Gizmoなど、
// Project内容を編集するruntime処理。

const slideStateToProjectData = function (slideState) {
  return {
    id: slideState.id,

    label: slideState.label ?? "",

    imagePath: normalizeSlideImagePath(slideState.imagePath),
    transparentInPresentation: slideState.transparentInPresentation === true,

    slideScale: normalizeSlideScale(slideState.slideScale),

    drawings: structuredClone(slideState.drawings ?? []),

    transform: {
      position: vector3ToArray(slideState.position),

      rotation: quaternionToArray(slideState.rotationQuaternion),
    },

    camera: {
      position: vector3ToArray(slideState.cameraPosition),

      rotation: quaternionToArray(slideState.cameraRotation),
    },

    scenePreset: slideState.scenePreset ?? "default",

    environmentOverride: {
      ...(slideState.environmentOverride ?? {}),
    },
    atmosphereOverrideEnabled: slideState.atmosphereOverrideEnabled === true,
    ...(slideState.atmosphereOverrideEnabled === true ? { atmosphereOverride: normalizeAtmosphereEffects(slideState.atmosphereOverride) } : {}),

    transitionPreset: slideState.transitionPreset ?? "default",

    transitionOverride: {
      ...(slideState.transitionOverride ?? {}),
    },
    transitionOverrideEnabled: slideState.transitionOverrideEnabled,
    transitionOverrideMode: slideState.transitionOverrideMode,

    soundPreset: slideState.soundPreset ?? "default",

    soundOverride: {
      ...(slideState.soundOverride ?? {}),
    },
    soundOverrideEnabled: slideState.soundOverrideEnabled,
    soundOverrideMode: slideState.soundOverrideMode,

    bgmOverride: normalizeSlideBgmOverride(slideState.bgmOverride),

    autoPlayOverride: normalizeSlideAutoPlayOverride(
      slideState.autoPlayOverride,
    ),

    interaction: normalizeSlideInteraction(slideState),
    action: normalizeSlideInteraction(slideState).type === "open-url" ? normalizeSlideInteraction(slideState).url : "",
  };
};

const buildProjectDataForSave = function () {
  if (!currentProjectData) {
    currentProjectData = createDefaultProjectData();
  }

  return {
    version: currentProjectData.version ?? 1,

    name: projectName ?? currentProjectData.name ?? "Untitled",

    scenePresets: structuredClone(currentProjectData.scenePresets ?? {}),

    transitionPresets: structuredClone(
      currentProjectData.transitionPresets ?? {},
    ),

    // Project BGM retired: Scene Presets own BGM configuration.

    // Preserve Scene-only migration status across save / load.
    bgmSourceMode: "scene",

    presentationSettings: normalizePresentationSettings(presentationSettings),

    cameraFramingOffset: normalizeCameraFramingOffset(currentProjectData.cameraFramingOffset),
    // Effects-1H: Scene Presets now own atmosphere effects. The legacy
    // project-wide value is intentionally omitted on new saves.

    assetLibrary: structuredClone(currentProjectData.assetLibrary ?? []),

    // Camera-2C: preserve registered Skybox sets without changing legacy scene paths.
    skyboxLibrary: structuredClone(currentProjectData.skyboxLibrary ?? []),

    audioAssets: structuredClone(currentProjectData.audioAssets ?? {}),

    // Clean Scene-only projects do not need the legacy soundAssets field.
    // Keep it whenever legacy data exists, to avoid dropping old references.
    ...(currentProjectData.bgmSourceMode !== "scene" || Object.keys(currentProjectData.soundAssets ?? {}).length
      ? { soundAssets: structuredClone(currentProjectData.soundAssets ?? {}) }
      : {}),

    soundPresets: structuredClone(currentProjectData.soundPresets ?? {}),

    slides: slideStates.map(slideStateToProjectData),
  };
};

const getAvailableSoundAssetNames = function (kind = null) {
  const assets = normalizeAudioAssets(currentProjectData?.audioAssets, currentProjectData?.soundAssets);
  return Object.entries(assets)
    .filter(([id, asset]) => id !== 'NONE' && (!kind || asset.type === kind))
    .map(([id]) => id);
};

const projectStatus = createProjectStatus({
  readData: () => currentProjectData ? buildProjectDataForSave() : null,
  stateElement: document.getElementById("projectSaveState"),
  countElement: document.getElementById("projectSlideCount"),
  noticeElement: projectLoadStatus,
});
let projectStatusRefreshTimer = null;
const scheduleProjectStatusRefresh = function () {
  clearTimeout(projectStatusRefreshTimer);
  projectStatusRefreshTimer = setTimeout(() => { if (!projectOperationBusy) projectStatus.refresh(); }, 120);
};
for (const eventName of ["input", "change", "click", "keyup"]) {
  document.addEventListener(eventName, scheduleProjectStatusRefresh);
}
setInterval(() => { if (!projectOperationBusy) projectStatus.refresh(); }, 750);

const saveProjectJsonToDirectory = async function (directoryHandle) {
  const projectData = buildProjectDataForSave();

  // メモリ側も最新状態へ
  currentProjectData = projectData;

  const jsonText = JSON.stringify(projectData, null, 2);

  const fileHandle = await directoryHandle.getFileHandle("project.json", {
    create: true,
  });

  const writable = await fileHandle.createWritable();

  await writable.write(jsonText);

  await writable.close();

  return projectData;
};

const ensureProjectDirectory = async function () {
  if (currentProjectDirectoryHandle) {
    return currentProjectDirectoryHandle;
  }

  const directoryHandle = await window.showDirectoryPicker({
    mode: "readwrite",
  });

  currentProjectDirectoryHandle = directoryHandle;

  return directoryHandle;
};

// Keep the slide and its camera together when an insertion would overlap a
// previously placed Slide. This is deliberately applied only to NEW copies.
const avoidSlidePositionOverlap = function (newSlide) {
  if (!newSlide?.position || !newSlide?.cameraPosition) return;
  const otherPositions = slideStates.map(slide => slide.position).filter(Boolean);
  if (!otherPositions.length) return;
  const right = camera?.getDirection?.(Vector3.Right()) ?? Vector3.Right();
  const delta = findNonOverlappingOffset(newSlide.position, otherPositions, right);
  if (delta.lengthSquared() < 1e-8) return;
  newSlide.position.addInPlace(delta);
  newSlide.cameraPosition.addInPlace(delta);
};

// Improve-1C: persisted on this browser; the project format remains unchanged.
const SLIDE_INSERT_PREF_KEY = 'slidespace.slideInsertOptions.v1';
const slideInsertControls = {
  x: document.getElementById('slideInsertOffsetX'),
  y: document.getElementById('slideInsertOffsetY'),
  z: document.getElementById('slideInsertOffsetZ'),
  move: document.getElementById('slideInsertMoveCamera'),
};
try {
  const saved = JSON.parse(localStorage.getItem(SLIDE_INSERT_PREF_KEY) || 'null');
  if (saved && typeof saved === 'object') {
    for (const key of ['x', 'y', 'z']) if (Number.isFinite(Number(saved[key]))) slideInsertControls[key].value = String(saved[key]);
    if (typeof saved.move === 'boolean') slideInsertControls.move.checked = saved.move;
  }
} catch {}
const readSlideInsertOptions = () => ({
  ...Object.fromEntries(['x','y','z'].map(key => [key, Math.max(-10000,Math.min(10000,Number(slideInsertControls[key]?.value) || 0))])),
  move: slideInsertControls.move?.checked === true,
});
for (const input of Object.values(slideInsertControls)) input?.addEventListener('change', () => {
  try { localStorage.setItem(SLIDE_INSERT_PREF_KEY, JSON.stringify(readSlideInsertOptions())); } catch {}
});
const recordCurrentSlide = async function ({ blank = false, transparent = false, placement = "end" } = {}) {
  // UI-1B2: avoid firing an unrelated control effect during slide creation.

  const selectedSlideIdBefore = getCurrentSlideId();
  const selectedIdsBefore = [...selectedSlideIds];

  // =========================================
  // ID / filename
  // =========================================

  const slideId = createUniqueSlideId();

  const imagePath = blank ? null : (await resolveSlideImagePathFromId(slideId) ?? `slides/slide(${slideId}).png`);

  // =========================================
  // 現在のカメラ姿勢
  // =========================================

  const cameraPosition = camera.position.clone();

  const cameraRotation = camera.rotationQuaternion.clone();

  // =========================================
  // カメラのForward
  // =========================================

  const forward = camera.getDirection(Vector3.Forward());

  // =========================================
  // スライドPlaneの位置
  //
  // カメラから cameraRadiusInit だけ前方
  // =========================================

  const newSlideDistance = cameraRadiusInit;
  const slidePosition = cameraPosition.add(forward.scale(newSlideDistance));
  // Camera-local position offset, including the newly associated camera pose.
  const slideInsertOptions = readSlideInsertOptions();
  const localOffset = camera.getDirection(Vector3.Right()).scale(slideInsertOptions.x)
    .addInPlace(camera.getDirection(Vector3.Up()).scale(slideInsertOptions.y))
    .addInPlace(forward.scale(slideInsertOptions.z));
  slidePosition.addInPlace(localOffset);
  cameraPosition.addInPlace(localOffset);

  // =========================================
  // スライドPlaneの回転
  // =========================================

  const slideRotation = cameraRotation.clone();

  // =========================================
  // 新しいslideStates
  // =========================================

  const newInfo = {
    id: slideId,

    label: "",

    imagePath: imagePath,
    transparentInPresentation: transparent,

    slideScale: {
      x: 1,
      y: 1,
    },

    position: slidePosition,

    rotationQuaternion: slideRotation,

    cameraPosition: cameraPosition,

    cameraRotation: cameraRotation,

    sceneState: getCurrentSceneState(),

    scenePreset: blank ? getEditingScenePresetName() : (getCurrentScenePresetName() ?? "default"),

    environmentOverride: {},
    atmosphereOverrideEnabled: false,

    transitionPreset: "default",

    transitionOverride: {},

    soundPreset: "default",

    soundOverride: {},

    bgmOverride: {},

    autoPlayOverride: {},

    interaction: {type:"none",url:""},
    action: "",

    // Runtime
    imageUrl: null,

    mesh: null,
  };

  // Scene-1X: avoid placing a new Slide directly on top of an existing Slide.
  avoidSlidePositionOverlap(newInfo);

  // =========================================
  // Plane生成
  // =========================================

  const slideMesh = MeshBuilder.CreatePlane(
    "slide-" + slideId,
    {
      width: 1.6,

      height: 0.9,

      sideOrientation: Mesh.DOUBLESIDE,
    },
    scene,
  );

  slideMesh.scaling.x = 1;

  slideMesh.scaling.y = 1;

  slideMesh.scaling.z = 1;

  slideMesh.position.copyFrom(slidePosition);

  slideMesh.rotationQuaternion = slideRotation.clone();

  // =========================================
  // 記録用Planeなので半透明Material
  // =========================================

  const material = new StandardMaterial(
    "slide-record-material-" + slideId,
    scene,
  );

  material.diffuseColor = transparent
    ? new Color3(0.18, 0.48, 0.9)
    : new Color3(1, 1, 1);

  material.alpha = 0.5;

  slideMesh.material = material;

  newInfo.mesh = slideMesh;

  // =========================================
  // slideStatesへ追加
  // =========================================

  const insertIndex = currentSlideIndex >= 0 && placement !== "end"
    ? currentSlideIndex + (placement === "after" ? 1 : 0) : slideStates.length;

  slideStates.splice(insertIndex, 0, newInfo);

  slideCount = slideStates.length;

  currentSlideIndex = insertIndex;

  setSingleSlideSelection(currentSlideIndex);

  // =========================================
  // History
  // =========================================

  recordSlidePresenceHistory({
    slideState: newInfo,

    index: insertIndex,

    beforeExists: false,

    afterExists: true,

    selectedSlideIdBefore: selectedSlideIdBefore,

    selectedSlideIdAfter: newInfo.id,
    selectedSlideIdsBefore: selectedIdsBefore,
    selectedSlideIdsAfter: [newInfo.id],
  });

  // =========================================
  // UI
  // =========================================

  await applyCurrentSlideEditorState();

  renderTable();

  if (!blank || slideInsertOptions.move) await currentSlide();

  refreshSlideSelectionUi();
  refreshSlideManagementUi();
  refreshCurrentSlidePropertiesUi();

  refreshSlideSettingsInspector();

  // A new Slide immediately makes its Scene preset "used" in the editor.
  refreshEditingScenePresetSelector();
  renderSlideThumbnails();
};

// Preset, Override Editor UI
const setSelectOptions = function (selectElement, values, selectedValue) {
  selectElement.innerHTML = "";

  for (const value of values) {
    const option = document.createElement("option");

    option.value = value;

    option.textContent = value;

    if (value === selectedValue) {
      option.selected = true;
    }

    selectElement.appendChild(option);
  }
};

const refreshEditingScenePresetSelector = function () {
  const names = Object.keys(currentProjectData?.scenePresets ?? {});

  if (names.length === 0) {
    editingScenePresetName = null;
    scenePresetSelector.innerHTML = "";
    scenePresetSelector.disabled = true;
    const unusedActions = document.querySelector("#unusedSceneActions");
    if (unusedActions) unusedActions.hidden = true;
    refreshProjectPanelContext();
    return;
  }

  if (!names.includes(editingScenePresetName)) {
    const currentSlide = getCurrentSlideState();

    const preferredName = currentSlide?.scenePreset ?? "default";

    editingScenePresetName = names.includes(preferredName)
      ? preferredName
      : names[0];
  }

  scenePresetSelector.disabled = false;
  renameScenePresetButton.disabled = editingScenePresetName === "default";

  setSelectOptions(scenePresetSelector, names, editingScenePresetName);
  // Scene-1W: preserve the actual Scene ID as the option value; only annotate its label.
  for (const option of scenePresetSelector.options) {
    const count = countSlidesUsingScenePreset(option.value);
    if (count === 0) {
      option.textContent = `${option.value} ${t("(Unused)")}`;
    }
  }
  const unusedActions = document.querySelector("#unusedSceneActions");
  if (unusedActions) {
    unusedActions.hidden = slideStates.some(state => (state.scenePreset ?? "default") === editingScenePresetName);
    const apply = document.getElementById("applyUnusedSceneToCurrent");
    if (apply) apply.disabled = !getCurrentSlideState();
  }

  refreshProjectPanelContext();
  refreshScenePresetBgmControls();
  refreshAtmosphereEffectsUI();
  refreshEnvironmentEditTargetUi();
  syncEnvironmentUi(getEnvironmentForEditorDisplay());
};

const refreshScenePresetManagementUi = function () {
  // 左Panel：Editing ScenePreset
  refreshEditingScenePresetSelector();

  // 右Panel：Current Slide / Selected SlidesのPreset
  refreshSharedPresetControls();

  // スライドの情報表示
  refreshSlideSettingsInspector();

  // スライド一覧
  renderTable();

  // 左PanelのProject Context
  refreshProjectPanelContext();
};

const selectEditingScenePreset = function (name) {
  if (!currentProjectData?.scenePresets?.[name]) {
    return false;
  }

  editingScenePresetName = name;

  refreshScenePresetManagementUi();

  return true;
};

const getCurrentSlideState = function () {
  if (currentSlideIndex < 0 || currentSlideIndex >= slideStates.length) {
    return null;
  }

  return slideStates[currentSlideIndex];
};

// Scene-4D: Slide Interaction supports external URL and project-local web entry files.
const scene4cType = document.getElementById('slideInteractionType');
const scene4cUrl = document.getElementById('slideInteractionUrl');
const scene4cUrlLabel = document.getElementById('slideInteractionUrlLabel');
const scene4cStatus = document.getElementById('slideInteractionStatus');
const scene4cUrlRow = document.getElementById('slideInteractionUrlRow');
const scene4cTest = document.getElementById('slideInteractionTest');
const scene4cRefreshInteraction = () => {
  const slide = getCurrentSlideState();
  const interaction = normalizeSlideInteraction(slide);
  const local = interaction.type === 'local-web';
  if (scene4cType) { scene4cType.disabled = !slide; scene4cType.value = interaction.type; }
  if (scene4cUrl) {
    scene4cUrl.disabled = !slide || interaction.type === 'none';
    scene4cUrl.value = interaction.url;
    scene4cUrl.placeholder = local ? 'web/index.html' : 'https://example.com';
  }
  if (scene4cUrlLabel) { scene4cUrlLabel.dataset.i18n = local ? 'Local web entry (web/)' : 'URL (http/https)'; scene4cUrlLabel.textContent = t(scene4cUrlLabel.dataset.i18n); }
  if (scene4cUrlRow) scene4cUrlRow.hidden = interaction.type === 'none';
  const valid = local ? !!currentProjectDirectoryHandle && !!safeLocalWebPath(interaction.url) : !!safeInteractionUrl(interaction.url);
  if (scene4cTest) scene4cTest.disabled = !slide || interaction.type === 'none' || !valid;
  if (scene4cStatus) scene4cStatus.textContent = interaction.type !== 'none' && interaction.url && !valid
    ? t(local ? 'Use a safe path inside web/' : 'Enter a valid http/https URL') : '';
};
const scene4cCommitInteraction = () => {
  const slide = getCurrentSlideState();
  if (!slide) return;
  const old = normalizeSlideInteraction(slide);
  const next = {type:scene4cType.value, url:scene4cType.value !== 'none' ? scene4cUrl.value.trim() : '', ...(old.text ? {text:old.text} : {})};
  const before = beginSettingsEdit();
  slide.interaction = next;
  slide.action = next.type === 'open-url' ? next.url : '';
  finishSettingsEdit(before);
  scene4cRefreshInteraction();
  if (isPresentationMode()) switchAction();
};
scene4cType?.addEventListener('change', () => {
  // Do not accidentally keep a remote URL as a project-relative local path.
  const slide = getCurrentSlideState();
  const previousType = normalizeSlideInteraction(slide).type;
  if ((previousType === 'local-web') !== (scene4cType.value === 'local-web')) scene4cUrl.value = '';
  scene4cCommitInteraction();
});
scene4cUrl?.addEventListener('change', scene4cCommitInteraction);
scene4cUrl?.addEventListener('blur', scene4cCommitInteraction);
scene4cTest?.addEventListener('click', () => {
  const interaction = {type: scene4cType.value, url: scene4cUrl.value.trim()};
  const valid = interaction.type === 'local-web' ? !!safeLocalWebPath(interaction.url) : !!safeInteractionUrl(interaction.url);
  if (valid) void openSlideInteraction(interaction);
});
// Attached text is independent of URL / local-web actions; no HTML is evaluated.
const attachedTextEditorDialog = document.getElementById('slideAttachedTextEditorDialog');
const attachedTextEditorInput = document.getElementById('slideAttachedTextEditorInput');
const attachedTextViewerDialog = document.getElementById('slideAttachedTextViewerDialog');
const attachedTextViewerContent = document.getElementById('slideAttachedTextViewerContent');
const updateAttachedTextInspector = () => {
  const text = normalizeSlideInteraction(getCurrentSlideState()).text || '';
  const edit = document.getElementById('slideAttachedTextEdit');
  const clear = document.getElementById('slideAttachedTextClear');
  const status = document.getElementById('slideAttachedTextStatus');
  if (edit) edit.disabled = !getCurrentSlideState();
  if (clear) clear.disabled = !getCurrentSlideState() || !text;
  if (status) status.textContent = text ? t('Attached text saved') : t('No attached text');
};
const saveAttachedText = (text) => {
  const slide = getCurrentSlideState();
  if (!slide) return;
  const previous = normalizeSlideInteraction(slide);
  if ((previous.text || '') === text) return;
  const before = beginSettingsEdit();
  slide.interaction = {...previous, ...(text ? {text} : {})};
  if (!text) delete slide.interaction.text;
  finishSettingsEdit(before);
  updateAttachedTextInspector();
  if (isPresentationMode()) switchAction();
};
const openSlideTextViewer = () => {
  const text = attachedTextForCurrentSlide();
  if (!text || !attachedTextViewerDialog || !attachedTextViewerContent) return;
  attachedTextViewerContent.value = text;
  attachedTextViewerDialog.showModal();
};
document.getElementById('slideAttachedTextEdit')?.addEventListener('click', () => {
  if (!getCurrentSlideState() || !attachedTextEditorDialog) return;
  attachedTextEditorInput.value = attachedTextForCurrentSlide();
  attachedTextEditorDialog.showModal();
  attachedTextEditorInput.focus();
});
document.getElementById('slideAttachedTextSave')?.addEventListener('click', () => {
  saveAttachedText(attachedTextEditorInput.value);
  attachedTextEditorDialog.close();
});
document.getElementById('slideAttachedTextCancel')?.addEventListener('click', () => attachedTextEditorDialog.close());
document.getElementById('slideAttachedTextClear')?.addEventListener('click', () => saveAttachedText(''));
document.getElementById('slideAttachedTextViewerClose')?.addEventListener('click', () => attachedTextViewerDialog.close());
document.getElementById('slideAttachedTextCopy')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(attachedTextViewerContent.value || '');
    const label = document.getElementById('slideAttachedTextCopyStatus');
    if (label) label.textContent = t('Copied to clipboard');
  } catch {
    // Text stays visible and selectable for manual copying in restricted contexts.
    const label = document.getElementById('slideAttachedTextCopyStatus');
    if (label) label.textContent = t('Clipboard unavailable');
  }
});
attachedTextViewerDialog?.addEventListener('close', () => {
  // Presentation-only edits never enter the project model.
  if (attachedTextViewerContent) attachedTextViewerContent.value = '';
  const label = document.getElementById('slideAttachedTextCopyStatus');
  if (label) label.textContent = '';
});
// Do not let Escape used to close these native dialogs also exit presentation mode.
for (const dialog of [attachedTextEditorDialog, attachedTextViewerDialog]) {
  dialog?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') event.stopPropagation();
  });
}
const refreshSlideSettingsInspector = function () {
  scene4cRefreshInteraction();
  updateAttachedTextInspector();
  const slideState = getCurrentSlideState();
  const sceneName = document.getElementById("inspectorScenePresetName");
  if (sceneName) sceneName.textContent = slideState ? (slideState.scenePreset ?? "default") : "—";

  // =====================================
  // スライドなし
  // =====================================

  if (!slideState) {
    slideSettingsEmptyMessage.style.display = "";

    slideSettingsContent.style.display = "none";

    return;
  }

  slideSettingsEmptyMessage.style.display = "none";

  slideSettingsContent.style.display = "";

  // =====================================
  // Environment Override
  // =====================================

  const environmentOverride = slideState.environmentOverride ?? {};

  const environmentOverrideKeys = Object.keys(environmentOverride);

  environmentOverrideStatus.textContent =
    environmentOverrideKeys.length > 0
      ? "Override: " + environmentOverrideKeys.join(", ")
      : "Preset値を使用";

  // Keep the clear button in sync with changes made in the shared Scene/Slide
  // environment editor, not only when the slide selection changes.
  refreshMultiSlideActionButtons();

  refreshSlideBgmOverrideControls();

  refreshScenePresetBgmControls();

  refreshSlideAutoPlayControls();
  refreshSlideAtmosphereEffectsUI();
  atmosphereEffectsController?.setSettings(getActiveSceneAtmosphereSettings());
};

// Asset
// Scene-2L: Project-local placed Asset clipboard; copies are snapshots, not references.
const copySelectedAssetsButton = document.getElementById("copySelectedAssetsButton");
const pasteSelectedAssetsButton = document.getElementById("pasteSelectedAssetsButton");
const assetCopyOffsetInputs = ["X", "Y", "Z"].map(axis => document.getElementById(`assetCopyOffset${axis}`));
const scene2lAssetClipboardStatus = document.getElementById("scene2lAssetClipboardStatus");
let assetClipboardSnapshot = [];
let assetClipboardProject = null;
const scene2lOffset = () => assetCopyOffsetInputs.map(input => Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : 0);
const scene2lSetStatus = (key, count) => { scene2lAssetClipboardStatus.textContent = count ? `${t(key)} (${count})` : t(key); };

const getCurrentSceneAssets = function () {
  const slideState = getCurrentSlideState();

  if (!slideState || !currentProjectData) {
    return [];
  }

  return resolveSceneAssets(currentProjectData, slideState);
};

const getSelectedSceneAssetConfig = function () {
  if (scenePreviewUi.hideAssets && isEditorMode()) return null;
  if (isEditorMode() && scene2oIsAssetHidden(editingScenePresetName,selectedSceneAssetId)) return null;
  if (!selectedSceneAssetId) {
    return null;
  }

  const assets = getEditingSceneAssets();

  return assets.find((asset) => asset.id === selectedSceneAssetId) ?? null;
};

const getSelectedLoadedAsset = function () {
  if (!selectedSceneAssetId || !isEditingScenePresetVisible()) {
    return null;
  }

  const cachedPreset = scenePresetAssetCache.get(editingScenePresetName);

  if (!cachedPreset) {
    return null;
  }

  return (
    cachedPreset.assets?.find(
      (loadedAsset) => loadedAsset.config?.id === selectedSceneAssetId,
    ) ?? null
  );
};

const isEditingScenePresetVisible = function () {
  return (
    editingScenePresetName !== null &&
    (editingScenePresetName === activeScenePresetName ||
      (scenePreviewUi.allScenes && isEditorMode() && !scenePreviewUi.previewName)) &&
    !scenePreviewUi.hideAssets
  );
};

const refreshSceneAssetActionButtons = function () {
  const hasEditingPreset = !!getEditingScenePresetConfig();
  const hasSelectedAsset = scene2cGetGroupAssets().length > 0;

  addSceneAssetButton.disabled = !hasEditingPreset;

  duplicateSceneAssetButton.disabled = !hasEditingPreset || !hasSelectedAsset;

  deleteSceneAssetButton.disabled = !hasEditingPreset || !hasSelectedAsset;
  if (copySelectedAssetsButton) copySelectedAssetsButton.disabled = editorHistoryBusy || !hasSelectedAsset;
  if (pasteSelectedAssetsButton) pasteSelectedAssetsButton.disabled = editorHistoryBusy || !assetClipboardSnapshot.length || assetClipboardProject !== currentProjectData;
};

let scene4cAssetSelectionCleared = false;
const refreshSceneAssetEditor = function () {
  document.dispatchEvent(new Event("slidespace:selection-changed"));
  // 左のEditing ScenePresetのAsset一覧
  const assets = getEditingSceneAssets();

  // Keep the Scene Assets selection in sync with the Transform inspector.
  scenePlacedAssetSelector.replaceChildren();
  if (!assets.length) {
    const option = new Option('No placed assets', '');
    scenePlacedAssetSelector.add(option);
    scenePlacedAssetSelector.disabled = true;
    scenePlacedAssetInfo.textContent = 'Add an asset file to this Scene Preset first.';
  } else {
    scenePlacedAssetSelector.disabled = false;
  }

  // =====================================
  // Assetなし
  // =====================================

  if (assets.length === 0) {
    selectedSceneAssetId = null;

    detachAssetGizmo();

    sceneAssetEmptyMessage.style.display = "";

    sceneAssetEditorContent.style.display = "none";

    refreshSceneAssetActionButtons();
    scene2cUpdateGroupStatus();

    return;
  }

  sceneAssetEmptyMessage.style.display = "none";

  sceneAssetEditorContent.style.display = "";

  // =====================================
  // 選択Assetの妥当性確認
  // =====================================

  const selectedExists = assets.some(
    (asset) => asset.id === selectedSceneAssetId,
  );
  if (selectedExists) scene4cAssetSelectionCleared = false;

  if (!selectedExists && !scene4cAssetSelectionCleared) {
    selectedSceneAssetId = assets[0].id;
  }

  // =====================================
  // Selector
  // =====================================

  sceneAssetSelector.innerHTML = "";
  if (scene4cAssetSelectionCleared) sceneAssetSelector.add(new Option(t("No Asset selected"), ""));

  for (const asset of assets) {
    const option = document.createElement("option");

    option.value = asset.id;

    option.textContent = placedAssetDisplay(asset, currentProjectData?.assetLibrary);

    if (asset.id === selectedSceneAssetId) {
      option.selected = true;
    }

    sceneAssetSelector.appendChild(option);
  }

  if (scene4cAssetSelectionCleared) scenePlacedAssetSelector.add(new Option(t('No Asset selected'), ''));
  for (const asset of assets) {
    const option = new Option(placedAssetDisplay(asset, currentProjectData?.assetLibrary), asset.id);
    option.selected = asset.id === selectedSceneAssetId;
    scenePlacedAssetSelector.add(option);
  }
  scenePlacedAssetInfo.textContent = `${assets.length} placed asset(s). Duplicate and Delete act on the selected item only.`;
  refreshSceneAssetActionButtons();
  scene2cUpdateGroupStatus();

  // =====================================
  // Config
  // =====================================

  const asset = getSelectedSceneAssetConfig();

  if (!asset) {
    return;
  }

  const transform = ensureAssetTransform(asset);

  selectedAssetId.textContent = asset.id ?? "";

  selectedAssetType.textContent = asset.type ?? "";

  selectedAssetSource.textContent = asset.src ?? "";

  // Transform表示
  refreshSelectedAssetTransformInputs();

  refreshAssetUniformScaleUi();

  // =====================================
  // Glow
  // =====================================

  assetGlowCheck.checked = asset.glow ?? false;
};

const applySelectedAssetTransform = function () {
  const assetConfig = getSelectedSceneAssetConfig();

  if (!assetConfig || !editingScenePresetName) {
    return;
  }

  // Editing ScenePresetのロード済みAssetを取得
  const loadedAsset = getLoadedAssetByPresetAndId(
    editingScenePresetName,
    assetConfig.id,
  );

  // 未ロードならConfigの更新だけでよい
  if (!loadedAsset?.rootNode) {
    return;
  }

  applyAssetTransform(loadedAsset.rootNode, assetConfig);

  loadedAsset.rootNode.computeWorldMatrix(true);
};

const updateSelectedAssetPosition = function () {
  const asset = getSelectedSceneAssetConfig();

  if (!asset) {
    return;
  }

  const transform = ensureAssetTransform(asset);

  transform.position = [
    Number(assetPositionX.value),

    Number(assetPositionY.value),

    Number(assetPositionZ.value),
  ];

  applySelectedAssetTransform();
};

const updateSelectedAssetScale = function () {
  const asset = getSelectedSceneAssetConfig();

  if (!asset) {
    return;
  }

  const transform = ensureAssetTransform(asset);

  const nextScale = [Number(assetScaleX.value), Number(assetScaleY.value), Number(assetScaleZ.value)];
  if (!nextScale.every(v => Number.isFinite(v) && v > 0)) return;
  transform.scale = nextScale;
  applySelectedAssetTransform();
};

// Rotation edits follow the selected Gizmo axis. Displayed Euler angles are
// reference coordinates; setting one component may affect the other readings.
const assetRotationFields = () => ({
  pitch: assetRotationPitch, yaw: assetRotationYaw, roll: assetRotationRoll,
});
const getAssetEulerDegrees = () => {
  const asset = getSelectedSceneAssetConfig();
  if (!asset) return null;
  const transform = ensureAssetTransform(asset);
  const euler = quaternionFromArray(transform.rotation, [0, 0, 0, 1]).toEulerAngles();
  return { pitch: radToDeg(euler.x), yaw: radToDeg(euler.y), roll: radToDeg(euler.z) };
};
const updateAssetRotationAxisTarget = (axis, degrees, referenceDegrees = null) => {
  const asset = getSelectedSceneAssetConfig();
  if (!asset || !Number.isFinite(degrees) || Math.abs(degrees) > 180) return false;
  const transform = ensureAssetTransform(asset);
  const displayed = referenceDegrees ?? getAssetEulerDegrees()?.[axis];
  if (!Number.isFinite(displayed)) return false;
  const delta = degrees - displayed;
  if (Math.abs(delta) < 1e-8) return false;
  transform.rotation = rotateAroundAxis(
    transform.rotation, axis, delta, assetGizmoCoordinateMode,
  );
  applySelectedAssetTransform();
  return true;
};
const resetSelectedAssetRotation = () => {
  const asset = getSelectedSceneAssetConfig();
  if (!asset) return false;
  const transform = ensureAssetTransform(asset);
  transform.rotation = [0, 0, 0, 1];
  applySelectedAssetTransform();
  refreshSelectedAssetTransformInputs();
  return true;
};

const applySelectedAssetGlow = function () {
  const asset = getSelectedSceneAssetConfig();

  if (!asset || !editingScenePresetName) {
    return;
  }

  const loadedAsset = getLoadedAssetByPresetAndId(
    editingScenePresetName,
    asset.id,
  );

  // 未ロードならConfigの更新だけ
  if (!loadedAsset || !activeGlowLayer) {
    return;
  }

  for (const mesh of loadedAsset.meshes ?? []) {
    if (!mesh) {
      continue;
    }

    if (asset.glow) {
      activeGlowLayer.removeExcludedMesh(mesh);
    } else {
      activeGlowLayer.addExcludedMesh(mesh);
    }
  }
};

const applyAssetGlowHistoryState = function (historyItem, glowValue) {
  const asset = findAssetConfigByHistory(historyItem);

  if (!asset) {
    return false;
  }

  asset.glow = Boolean(glowValue);

  const loadedAsset = findLoadedAssetByHistory(historyItem);

  if (loadedAsset && activeGlowLayer) {
    for (const mesh of loadedAsset.meshes ?? []) {
      if (!mesh) continue;

      if (asset.glow) {
        activeGlowLayer.removeExcludedMesh(mesh);
      } else {
        activeGlowLayer.addExcludedMesh(mesh);
      }
    }
  }

  if (
    editingScenePresetName === historyItem.presetName &&
    selectedSceneAssetId === historyItem.assetId
  ) {
    assetGlowCheck.checked = asset.glow;
  }

  return true;
};

const getSelectedAssetRootNode = function () {
  const loadedAsset = getSelectedLoadedAsset();

  if (!loadedAsset) {
    return null;
  }

  return loadedAsset.rootNode ?? null;
};

const setAssetGizmoMode = function (mode) {
  assetGizmoMode = mode;

  if (!activeGizmoManager) {
    return;
  }



  const positionEnabled = mode === "position";

  const rotationEnabled = mode === "rotation";

  const scaleEnabled = mode === "scale";

  activeGizmoManager.positionGizmoEnabled = positionEnabled;

  activeGizmoManager.rotationGizmoEnabled = rotationEnabled;

  activeGizmoManager.scaleGizmoEnabled = scaleEnabled;

  // Rotation / Positionは
  // World軸基準に固定
  if (activeGizmoManager.gizmos.positionGizmo) {
    activeGizmoManager.gizmos.positionGizmo.updateGizmoRotationToMatchAttachedMesh = false;
  }

  if (activeGizmoManager.gizmos.rotationGizmo) {
    activeGizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
  }

  refreshAssetGizmoButtons();

  refreshAssetGizmoSnapUi();

  applyAssetGizmoSnap();

  applyAssetGizmoCoordinateMode();

  refreshAssetGizmoCoordinateUi();
};

// Scene-3W: Mode highlighting belongs solely to the shared Selection Gizmo.
// Keep this adapter for existing callers without referencing removed legacy DOM.
const refreshAssetGizmoButtons = function () {};

const attachGizmoToSelectedAsset = function () {
  // Scene-2S: Inspector focus and explicit Selection are separate states.
  // Even if a mode (Move/Rotate/Scale) is active, no selection means no Gizmo.
  if (!isEditingScenePresetVisible() || !selectedSceneAssetId ||
      !canvasSelectedAssetKeys.get(editingScenePresetName)?.has(selectedSceneAssetId) ||
      scene2oIsAssetHidden(editingScenePresetName, selectedSceneAssetId)) {
    detachAssetGizmo();
    return;
  }

  if (!activeGizmoManager) {
    return;
  }

  const root = getSelectedAssetRootNode();

  if (!root) {
    activeGizmoManager.attachToNode(null);

    return;
  }

  root.computeWorldMatrix(true);

  // Scene-2X: when Selection Center is active, the handle is attached
  // to a virtual TransformNode instead of the focused Asset.
  activeGizmoManager.attachToNode(scene2xEnsurePivot() ?? root);

  // 表示するGizmoを設定
  setAssetGizmoMode(assetGizmoMode);
};

const detachAssetGizmo = function () {
  if (!activeGizmoManager) {
    return;
  }

  activeGizmoManager.attachToNode(null);
};

// ==========================================
// Editing ScenePreset と Asset Gizmo の同期
// ==========================================
const syncEditingSceneAssetGizmo = function () {
  if (
    appMode !== APP_MODE_EDITOR ||
    !isEditingScenePresetVisible() ||
    assetGizmoMode === "off"
  ) {
    detachAssetGizmo();
    return;
  }

  const assetConfig = getSelectedSceneAssetConfig();

  if (!assetConfig || !canvasSelectedAssetKeys.get(editingScenePresetName)?.has(assetConfig.id)) {
    detachAssetGizmo();
    return;
  }

  const loadedAsset = getLoadedAssetByPresetAndId(
    editingScenePresetName,
    assetConfig.id,
  );

  if (!loadedAsset?.rootNode) {
    detachAssetGizmo();
    return;
  }

  attachGizmoToSelectedAsset();
};

const syncSelectedAssetTransformFromNode = function () {
  const assetConfig = getSelectedSceneAssetConfig();

  const root = getSelectedAssetRootNode();

  if (!assetConfig || !root) {
    return;
  }

  const transform = ensureAssetTransform(assetConfig);

  // =============================
  // Position
  // =============================

  transform.position = [
    Number(root.position.x),
    Number(root.position.y),
    Number(root.position.z),
  ];

  // =============================
  // Rotation
  // =============================

  let rotationQuaternion = root.rotationQuaternion;

  // 念のためEulerしかない場合にも対応
  if (!rotationQuaternion) {
    rotationQuaternion = Quaternion.FromEulerAngles(
      root.rotation.x,
      root.rotation.y,
      root.rotation.z,
    );
  }

  const normalizedQuaternion = rotationQuaternion.clone().normalize();

  transform.rotation = quaternionToArray(normalizedQuaternion);

  // =============================
  // Scale
  // =============================

  transform.scale = [
    Number(root.scaling.x),
    Number(root.scaling.y),
    Number(root.scaling.z),
  ];
};

const registerAssetGizmoObservers = function (gizmoManager) {
  if (!gizmoManager) {
    return;
  }

  const positionGizmo = gizmoManager.gizmos.positionGizmo;

  const rotationGizmo = gizmoManager.gizmos.rotationGizmo;

  const scaleGizmo = gizmoManager.gizmos.scaleGizmo;

  // =============================
  // Position
  // =============================

  registerAssetGizmoDragBehavior(positionGizmo?.xGizmo?.dragBehavior);

  registerAssetGizmoDragBehavior(positionGizmo?.yGizmo?.dragBehavior);

  registerAssetGizmoDragBehavior(positionGizmo?.zGizmo?.dragBehavior);

  // =============================
  // Rotation
  // =============================

  registerAssetGizmoDragBehavior(rotationGizmo?.xGizmo?.dragBehavior);

  registerAssetGizmoDragBehavior(rotationGizmo?.yGizmo?.dragBehavior);

  registerAssetGizmoDragBehavior(rotationGizmo?.zGizmo?.dragBehavior);

  // =============================
  // Scale
  // =============================

  registerAssetGizmoDragBehavior(scaleGizmo?.xGizmo?.dragBehavior);

  registerAssetGizmoDragBehavior(scaleGizmo?.yGizmo?.dragBehavior);

  registerAssetGizmoDragBehavior(scaleGizmo?.zGizmo?.dragBehavior);

  // uniform scaleが存在する場合
  registerAssetGizmoDragBehavior(scaleGizmo?.uniformScaleGizmo?.dragBehavior);
};

const initializeAssetGizmoManager = function (gizmoManager) {
  gizmoManager.usePointerToAttachGizmos = false;

  // =====================================
  // Gizmoオブジェクトを一度生成
  // =====================================

  gizmoManager.positionGizmoEnabled = true;

  gizmoManager.rotationGizmoEnabled = true;

  gizmoManager.scaleGizmoEnabled = true;

  // =====================================
  // Drag Observer登録
  // =====================================

  registerAssetGizmoObservers(gizmoManager);

  // =====================================
  // 初期表示OFF
  // =====================================

  gizmoManager.positionGizmoEnabled = false;

  gizmoManager.rotationGizmoEnabled = false;

  gizmoManager.scaleGizmoEnabled = false;
};

const suspendCameraControlForGizmo = function () {
  if (camera && cameraControlViaMouse) {
    cameraNavigation?.suspend();
  }
};

const restoreCameraControlAfterGizmo = function () {
  if (camera && cameraControlViaMouse) {
    cameraNavigation?.resume();
  }
};

// アセットファイル
const listProjectAssetFiles = async function () {
  if (!currentProjectDirectoryHandle) {
    return [];
  }

  let assetsDirectory;

  try {
    assetsDirectory =
      await currentProjectDirectoryHandle.getDirectoryHandle("assets");
  } catch (error) {
    if (error.name === "NotFoundError") {
      return [];
    }

    throw error;
  }

  const files = [];

  for await (const entry of assetsDirectory.values()) {
    if (entry.kind !== "file") {
      continue;
    }

    const name = entry.name;

    const lower = name.toLowerCase();

    if (!lower.endsWith(".glb") && !lower.endsWith(".spz")) {
      continue;
    }

    files.push({
      name: name,

      path: "assets/" + name,

      type: lower.endsWith(".spz") ? "spz" : "glb",
    });
  }

  files.sort((a, b) => a.name.localeCompare(b.name));

  return files;
};

const refreshAssetLibrarySelectors = function (preferredPath = "") {
  const registered = currentProjectData?.assetLibrary ?? [];
  const previous = preferredPath || projectAssetLibrarySelector.value;
  const scenePrevious = projectAssetFileSelector.value;
  const makeOption = item => {
    const option = new Option(assetDisplayWithFilename(item.label, item.path), item.path);
    option.dataset.assetType = item.type;
    return option;
  };
  const libraryOptions = registered.map(makeOption);
  const sceneOptions = registered.map(makeOption);
  projectAssetLibrarySelector.replaceChildren(...libraryOptions);
  projectAssetFileSelector.replaceChildren(...sceneOptions);
  if (registered.length) {
    if (registered.some(item => item.path === previous)) projectAssetLibrarySelector.value = previous;
    if (registered.some(item => item.path === scenePrevious)) projectAssetFileSelector.value = scenePrevious;
  } else {
    projectAssetLibrarySelector.add(new Option(t("No registered Asset files"), ""));
    projectAssetFileSelector.add(new Option(t("Register files in Project Asset Library"), ""));
  }
  projectAssetUnregisterButton.disabled = !registered.some(item => item.path === projectAssetLibrarySelector.value);
  projectAssetRenameButton.disabled = projectAssetUnregisterButton.disabled;
  const chosen = registered.find(item => item.path === projectAssetLibrarySelector.value);
  projectAssetResetNameButton.disabled = !chosen || chosen.label === assetFilename(chosen.path);
  projectAssetLibraryStatus.textContent = `${registered.length} ${t("registered Asset files")}`;
};

// Older project.json files had no Asset Library: migrate their existing assets/ listing
// once on open. A modern empty registry stays empty until the user registers files.
const refreshProjectAssetFileSelector = async function () {
  const generation = ++projectAssetFileRefreshGeneration;
  const targetDirectory = currentProjectDirectoryHandle;
  const targetProject = currentProjectData;
  if (!targetProject) return;
  if (targetProject.assetLibrary === null) {
    try {
      const detected = await listProjectAssetFiles();
      if (generation !== projectAssetFileRefreshGeneration ||
          targetDirectory !== currentProjectDirectoryHandle ||
          targetProject !== currentProjectData) return;
      targetProject.assetLibrary = registerAssets([], detected);
    } catch (error) {
      console.warn("Legacy Asset Library migration failed:", error);
      if (targetProject === currentProjectData) targetProject.assetLibrary = [];
    }
  }
  refreshAssetLibrarySelectors();
};

const registerDetectedAssetFiles = async function () {
  if (!currentProjectDirectoryHandle || !currentProjectData) return;
  const targetDirectory = currentProjectDirectoryHandle;
  const targetProject = currentProjectData;
  const files = await listProjectAssetFiles();
  if (targetDirectory !== currentProjectDirectoryHandle || targetProject !== currentProjectData) return;
  const previous = targetProject.assetLibrary ?? [];
  targetProject.assetLibrary = registerAssets(previous, files);
  refreshAssetLibrarySelectors();
};

const importProjectAssetFiles = async function (fileList) {
  const files = [...fileList].filter(file => /\.(glb|spz)$/i.test(file.name));
  if (!files.length || !currentProjectDirectoryHandle || !currentProjectData) return;
  const targetProject = currentProjectData;
  const targetDirectory = currentProjectDirectoryHandle;
  const folder = await targetDirectory.getDirectoryHandle("assets", { create: true });
  const added = [];
  for (const file of files) {
    if (targetProject !== currentProjectData || targetDirectory !== currentProjectDirectoryHandle) break;
    const safeName = file.name.replace(/[\/\\]/g, "_");
    const dot = safeName.lastIndexOf('.');
    const stem = safeName.slice(0, dot);
    const ext = safeName.slice(dot);
    let filename = safeName;
    let index = 2;
    // Never overwrite existing files, including those not registered in the library.
    while (true) {
      try { await folder.getFileHandle(filename); filename = `${stem}-${index++}${ext}`; }
      catch (error) { if (error.name === "NotFoundError") break; throw error; }
    }
    const handle = await folder.getFileHandle(filename, { create: true });
    const writable = await handle.createWritable();
    try { await writable.write(file); await writable.close(); }
    catch (error) { await writable.abort().catch(() => {}); throw error; }
    added.push({name: filename, path: `assets/${filename}`, type: ext.toLowerCase() === '.spz' ? 'spz' : 'glb'});
  }
  if (targetProject !== currentProjectData || targetDirectory !== currentProjectDirectoryHandle) return;
  targetProject.assetLibrary = registerAssets(targetProject.assetLibrary ?? [], added);
  refreshAssetLibrarySelectors(added.at(-1)?.path);
};

const getCurrentScenePresetConfig = function () {
  const slideState = getCurrentSlideState();

  if (!slideState || !currentProjectData) {
    return null;
  }

  const resolved = resolveScenePreset(currentProjectData, slideState);

  return resolved.preset;
};

const getEditingScenePresetConfig = function () {
  if (!editingScenePresetName || !currentProjectData) {
    return null;
  }

  return currentProjectData.scenePresets?.[editingScenePresetName] ?? null;
};

const getEditingSceneAssets = function () {
  const preset = getEditingScenePresetConfig();

  return preset?.assets ?? [];
};

const createUniqueAssetId = function (baseName = "asset") {
  const cleaned =
    baseName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-") || "asset";

  let candidate = cleaned;

  let index = 2;

  while (usedSceneAssetIds.has(candidate)) {
    candidate = cleaned + "-" + index;

    index++;
  }

  // ここで永久予約
  usedSceneAssetIds.add(candidate);

  return candidate;
};

const createDefaultAssetConfig = function (src, type) {
  const filename = src.split("/").pop() ?? "asset";

  return {
    id: createUniqueAssetId(filename),

    type: type,

    src: src,

    transform: {
      position: [0, 0, 0],

      rotation: [0, 0, 0, 1],

      scale: [1, 1, 1],
    },

    glow: type === "spz" ? false : true,
  };
};

const getSceneAssetLoadKey = function (presetName, assetId) {
  return JSON.stringify([presetName, assetId]);
};

const loadAndRegisterSceneAsset = async function (
  assetConfig,
  presetName = editingScenePresetName,
) {
  if (!scene || !presetName || !assetConfig) {
    return null;
  }

  const targetScene = scene;
  const generation = sceneAssetRuntimeGeneration;
  const targetProject = currentProjectData;

  const targetDirectory = currentProjectDirectoryHandle;
  const targetUrls = activeProjectObjectUrls;
  const targetGlowLayer = activeGlowLayer;

  const cachedPreset = scenePresetAssetCache.get(presetName);

  // 未ロードPresetはConfigのみ変更
  if (!cachedPreset) {
    return null;
  }

  const existing = cachedPreset.assets?.find(
    (item) => item.config?.id === assetConfig.id,
  );

  if (existing) {
    return existing;
  }

  const key = getSceneAssetLoadKey(presetName, assetConfig.id);

  // 同一Assetのロードが進行中なら共有
  const pending = sceneAssetLoadPromises.get(key);

  if (pending) {
    return await pending;
  }

  const loadPromise = (async () => {
    const loadedAsset = await loadAndConfigureSceneAsset(
      targetScene,
      assetConfig,
      targetUrls,
      targetGlowLayer,
      targetDirectory,
    );

    const currentPreset = currentProjectData?.scenePresets?.[presetName];

    const stillExists = currentPreset?.assets?.some(
      (item) => item === assetConfig,
    );

    const stillValid =
      generation === sceneAssetRuntimeGeneration &&
      scene === targetScene &&
      currentProjectData === targetProject &&
      scenePresetAssetCache.get(presetName) === cachedPreset &&
      currentProjectDirectoryHandle === targetDirectory &&
      activeProjectObjectUrls === targetUrls &&
      activeGlowLayer === targetGlowLayer &&
      stillExists;

    if (!stillValid) {
      disposeLoadedSceneAsset(loadedAsset);
      return null;
    }

    cachedPreset.assets ??= [];

    // 念のため、キャッシュ登録も重複防止
    const alreadyRegistered = cachedPreset.assets.find(
      (item) => item.config?.id === assetConfig.id,
    );

    if (alreadyRegistered) {
      disposeLoadedSceneAsset(loadedAsset);
      return alreadyRegistered;
    }

    // ロード中に変更されたTransform・Glowを反映
    applyAssetTransform(loadedAsset.rootNode, assetConfig);

    if (activeGlowLayer) {
      configureAssetGlow(loadedAsset, activeGlowLayer);
    }

    cachedPreset.assets.push(loadedAsset);

    setLoadedAssetVisible(loadedAsset, !scenePreviewUi.hideAssets &&
      !(isEditorMode() && scene2oIsAssetHidden(presetName,assetConfig.id)) &&
      (activeScenePresetName === presetName || (scenePreviewUi.allScenes && isEditorMode() && !scenePreviewUi.previewName)));

    return loadedAsset;
  })();

  sceneAssetLoadPromises.set(key, loadPromise);

  try {
    return await loadPromise;
  } finally {
    if (sceneAssetLoadPromises.get(key) === loadPromise) {
      sceneAssetLoadPromises.delete(key);
    }
  }
};

const disposeLoadedSceneAsset = function (loadedAsset) {
  if (!loadedAsset || loadedAsset.runtimeDisposed) {
    return;
  }

  loadedAsset.runtimeDisposed = true;

  // =====================================
  // Glowから除外解除
  // =====================================

  // ロード時に所属していたGlowLayerを使用
  const ownerGlowLayer = loadedAsset.ownerGlowLayer;

  if (ownerGlowLayer) {
    for (const mesh of loadedAsset.meshes ?? []) {
      if (!mesh) continue;

      try {
        ownerGlowLayer.removeExcludedMesh(mesh);
      } catch {
        // GlowLayerが破棄済みの場合など
      }
    }
  }

  // =====================================
  // rootNodeごと再帰dispose
  // =====================================

  if (loadedAsset.rootNode) {
    loadedAsset.rootNode.dispose(false, true);

    return;
  }

  // fallback
  for (const mesh of loadedAsset.meshes ?? []) {
    mesh?.dispose(false, true);
  }
};

const removeLoadedAssetFromScene = function (presetName, assetId) {
  const cachedPreset = scenePresetAssetCache.get(presetName);

  if (!cachedPreset) {
    return;
  }

  const loadedAsset =
    cachedPreset.assets?.find((item) => item.config?.id === assetId) ?? null;

  if (loadedAsset) {
    disposeLoadedSceneAsset(loadedAsset);
  }

  cachedPreset.assets = (cachedPreset.assets ?? []).filter(
    (item) => item.config?.id !== assetId,
  );
};

const refreshSelectedAssetTransformInputs = function () {
  const asset = getSelectedSceneAssetConfig();

  if (!asset) {
    return;
  }

  const transform = ensureAssetTransform(asset);

  // =============================
  // Position
  // =============================

  assetPositionX.value = Number(transform.position[0]).toFixed(3);

  assetPositionY.value = Number(transform.position[1]).toFixed(3);

  assetPositionZ.value = Number(transform.position[2]).toFixed(3);

  // =============================
  // Rotation Quaternion → Euler
  // =============================

  const quaternion = quaternionFromArray(transform.rotation, [0, 0, 0, 1]);

  const euler = quaternion.toEulerAngles();

  assetRotationPitch.value = radToDeg(euler.x).toFixed(2);

  assetRotationYaw.value = radToDeg(euler.y).toFixed(2);

  assetRotationRoll.value = radToDeg(euler.z).toFixed(2);
  for (const [axis, degrees] of Object.entries({
    pitch: radToDeg(euler.x), yaw: radToDeg(euler.y), roll: radToDeg(euler.z),
  })) {
    const slider = document.getElementById(`assetRotation${axis[0].toUpperCase()}${axis.slice(1)}Slider`);
    if (slider && document.activeElement !== slider) slider.value = String(Math.max(-180, Math.min(180, degrees)));
  }


  // =============================
  // Scale
  // =============================

  assetScaleX.value = Number(transform.scale[0]).toFixed(3);

  assetScaleY.value = Number(transform.scale[1]).toFixed(3);

  assetScaleZ.value = Number(transform.scale[2]).toFixed(3);
  for (const [i, axis] of ["x", "y", "z"].entries()) {
    const slider = assetScaleSliders[axis];
    if (!slider) continue;
    const value = Number(transform.scale[i]);
    slider.max = String(Math.max(5, Math.ceil(value)));
    slider.value = String(value);
  }
};

const syncSelectedAssetFromGizmo = function () {
  syncSelectedAssetTransformFromNode();

  refreshSelectedAssetTransformInputs();

  refreshAssetUniformScaleUi();
};

// Scene-2C: a Gizmo drag uses the focused Asset as a stable pivot.
// Other Assets use the *start* snapshot on every frame (no cumulative drift).
// Selected Slides are included only on an explicit opt-in, for translation.
// Scene-2R: selection is authoritative. The inspector's focused Asset is NOT
// implicitly selected; otherwise "0 Assets" can still hide/delete one Asset.
const scene2cGetGroupAssets = () => {
  const selected = [];
  const names = scenePreviewUi.allScenes ? [...canvasSelectedAssetKeys.keys()] : [editingScenePresetName];
  for (const name of names) {
    const ids = canvasSelectedAssetKeys.get(name);
    if (!name || !ids?.size) continue;
    for (const asset of getScenePresetConfigByName(name)?.assets ?? []) {
      if (ids.has(asset.id) && !scene2oIsAssetHidden(name,asset.id)) selected.push({presetName:name, asset});
    }
  }
  return selected;
};
const scene2cUpdateGroupStatus = () => {
  if (!scene2cGroupStatus) return;
  const count = scene2cGetGroupAssets().length;
  scene2cGroupStatus.textContent = `${t("Selected Assets")}: ${count}`;
};
const scene2cBeginGroup = () => {
  const focused = getSelectedSceneAssetConfig();
  if (!focused || !editingScenePresetName || !isEditingScenePresetVisible()) return null;
  if (!canvasSelectedAssetKeys.get(editingScenePresetName)?.has(focused.id)) return null;
  const assets = scene2cGetGroupAssets().map(({presetName,asset}) => ({
    presetName, assetId: asset.id, before: cloneAssetTransform(ensureAssetTransform(asset)),
  }));
  const slides = ['position','rotation','scale'].includes(assetGizmoMode) ? slideStates.filter(slide => selectedSlideIds.has(slide.id) && !scene2oIsSlideHidden(slide.id)).map(slide => ({
    slideId: slide.id, before: createSlideTransformHistorySnapshot(slide),
  })) : [];
  return { presetName: editingScenePresetName, focusId: focused.id,
    focusBefore: cloneAssetTransform(ensureAssetTransform(focused)), assets, slides,
    mode:assetGizmoMode };
};
const scene2cUpdateGroup = edit => {
  if (!edit) return;
  const focus = getSelectedSceneAssetConfig();
  if (!focus || focus.id !== edit.focusId || editingScenePresetName !== edit.presetName) return;
  const now = ensureAssetTransform(focus);
  const old = edit.focusBefore;
  const translation = Vector3.FromArray(now.position).subtract(Vector3.FromArray(old.position));
  const q0 = quaternionFromArray(old.rotation, [0,0,0,1]);
  const q1 = quaternionFromArray(now.rotation, [0,0,0,1]);
  const deltaQ = q1.multiply(q0.clone().invert()).normalize();
  const ratios = old.scale.map((n,i) => Math.abs(n)>1e-8 ? now.scale[i]/n : 1);
  const pivot = scene2vAssetGroupAnchor(edit) ?? Vector3.FromArray(old.position);
  for (const change of edit.assets) {
    const asset = getScenePresetConfigByName(change.presetName)?.assets?.find(item => item.id === change.assetId);
    if (!asset) continue;
    const before = change.before;
    const next = cloneAssetTransform(before);
    if (edit.mode === 'position') {
      next.position = Vector3.FromArray(before.position).add(translation).asArray();
    } else if (edit.mode === 'rotation') {
      next.position = (rotationPivotMode("asset") === "individual" ? Vector3.FromArray(before.position) : pivot.add(Vector3.FromArray(before.position).subtract(pivot).rotateByQuaternionToRef(deltaQ, new Vector3()))).asArray();
      next.rotation = quaternionToArray(deltaQ.multiply(quaternionFromArray(before.rotation,[0,0,0,1])).normalize());
    } else if (edit.mode === 'scale') {
      next.position = scalePositionAboutPivot(before.position, pivot.asArray(), ratios, scalePivotMode('asset'));
      next.scale = multiplyScale(before.scale, ratios);
    }
    asset.transform = next;
    const loaded = getLoadedAssetByPresetAndId(change.presetName, asset.id);
    if (loaded?.rootNode) { applyAssetTransform(loaded.rootNode,asset); loaded.rootNode.computeWorldMatrix(true); }
  }
  // Mixed selection: move selected Slides + associated cameras with selected Assets.
  // Rotation/scale of Slides deliberately requires the Slide Gizmo (different semantics).
  if (['position','rotation','scale'].includes(edit.mode)) for (const change of edit.slides) {
    const slide = slideStates.find(item => item.id === change.slideId);
    if (!slide) continue;
    const before = change.before;
    if (edit.mode === 'position') {
      slide.position = before.position.add(translation);
      slide.cameraPosition = before.cameraPosition.add(translation);
    } else if (edit.mode === 'rotation') {
      slide.position = rotationPivotMode('asset') === 'individual'
        ? before.position.clone()
        : pivot.add(before.position.subtract(pivot).applyRotationQuaternion(deltaQ));
      slide.rotationQuaternion = deltaQ.multiply(before.rotationQuaternion).normalize();
      syncCameraPoseAfterSlideTransform(slide, before);
    } else if (edit.mode === 'scale') {
      // Scale each Slide's position about the focused Asset's initial world-space pivot.
      // Move its Camera by the same translation so its stored relative pose stays intact.
      const newPosition = scalePositionAboutPivot(before.position.asArray(), pivot.asArray(), ratios, scalePivotMode('asset'));
      slide.position = Vector3.FromArray(newPosition);
      slide.cameraPosition = Vector3.FromArray(followSlideTranslation(before.cameraPosition.asArray(), before.position.asArray(), newPosition));
      const prior = normalizeSlideScale(before.slideScale);
      slide.slideScale = {
        x: prior.x * ratios[0], y: prior.y * ratios[1], z: prior.z * ratios[2],
      };
    }
    applySlideTransformStateToMesh(slide);
  }
};
const scene2cCommitGroup = edit => {
  if (!edit) return;
  const assets = edit.assets.map(change => {
    const asset = getScenePresetConfigByName(change.presetName)?.assets?.find(item => item.id === change.assetId);
    return asset ? {...change, after:cloneAssetTransform(ensureAssetTransform(asset))} : null;
  }).filter(change => change && !assetTransformsEqual(change.before,change.after));
  const slides = edit.slides.map(change => {
    const slide = slideStates.find(item => item.id === change.slideId);
    return slide ? {...change,after:createSlideTransformHistorySnapshot(slide)} : null;
  }).filter(change=>change && !slideTransformHistoryStatesEqual(change.before,change.after));
  if (assets.length || slides.length) pushEditorHistory({type:'scene2c-group-transform',presetName:edit.presetName,assets,slides});
};
const scene2cReplayGroup = async (item,direction) => {
  let applied = false;
  for (const change of item.assets) {
    const asset = getScenePresetConfigByName(change.presetName ?? item.presetName)?.assets?.find(a=>a.id===change.assetId);
    if (!asset) continue;
    asset.transform = cloneAssetTransform(change[direction]);
    const loaded = getLoadedAssetByPresetAndId(change.presetName ?? item.presetName,asset.id);
    if (loaded?.rootNode) { applyAssetTransform(loaded.rootNode,asset); loaded.rootNode.computeWorldMatrix(true); }
    applied=true;
  }
  for (const change of item.slides) {
    const slide = slideStates.find(x=>x.id===change.slideId);
    if (!slide) continue;
    const state=change[direction];
    slide.position=state.position.clone(); slide.cameraPosition=state.cameraPosition.clone();
    slide.rotationQuaternion=state.rotationQuaternion.clone(); slide.cameraRotation=state.cameraRotation.clone();
    slide.slideScale=normalizeSlideScale(state.slideScale);
    applySlideTransformStateToMesh(slide);
    applied=true;
  }
  if (applied) { refreshSelectedAssetTransformInputs(); await refreshAfterSlideTransformBatch(); }
  return applied;
};
// Scene-2X/4K: a virtual TransformNode carries the visible Gizmo at
// the chosen Group pivot (focused object or Selection Center). Nothing in the project is parented to this node: all
// changes are applied from drag-start snapshots, preserving scene ownership.
let scene2xPivotNode = null;
let scene2xPivotDrag = null;
let scene4iPivotCancelled = false;
// Scene-4I: for a focused, non-uniformly scaled target, use the existing
// unit-scale virtual pivot for LOCAL rotation. Babylon cannot align its
// RotationGizmo directly to a non-uniformly scaled attached node.
// This path is deliberately restricted to Active Object (or a genuinely
// single-object selection): it must never rotate an implicit Current Slide
// together with the focused Asset.
const scene4iLocalRotationTarget = () => {
  if (!isEditorMode() || scenePreviewUi.previewName) return null;
  const kind = scene2uChooseActiveKind();
  const mode = kind === 'slide' ? slideGizmoMode : assetGizmoMode;
  const coordinate = kind === 'slide' ? slideGizmoCoordinateMode : assetGizmoCoordinateMode;
  if (mode !== 'rotation' || coordinate !== 'local') return null;
  const selectedCount = getSelectedSlideEntries().filter(({slideState}) =>
    !scene2oIsSlideHidden(slideState.id)).length + scene2cGetGroupAssets().length;
  // Current and selection are independent. All Gizmo operations use the
  // selected set; the focused target determines the pivot, not the scope.
  if (!selectedCount) return null;
  if (kind === 'slide') {
    const slideState = getSlideGizmoTargetEntry()?.slideState;
    if (!slideState?.mesh || slideState.mesh.isDisposed()) return null;
    const node = slideState.mesh;
    node.computeWorldMatrix(true);
    const scale = new Vector3(1, 1, 1);
    node.getWorldMatrix().decompose(scale);
    return canMatchLocalRotation(scale) ? null : {kind,slideState};
  }
  if (kind === 'asset') {
    const asset = getSelectedSceneAssetConfig();
    const root = getSelectedAssetRootNode();
    if (!asset || !root) return null;
    root.computeWorldMatrix(true);
    const scale = new Vector3(1, 1, 1);
    root.getWorldMatrix().decompose(scale);
    return canMatchLocalRotation(scale) ? null : {kind,asset,presetName:editingScenePresetName};
  }
  return null;
};
const scene4iFocusedSnapshot = target => target.kind === 'slide' ? ({
  slides:[{slideId:target.slideState.id,before:createSlideTransformHistorySnapshot(target.slideState)}], assets:[],
}) : ({
  slides:[], assets:[{presetName:target.presetName,assetId:target.asset.id,
    before:cloneAssetTransform(ensureAssetTransform(target.asset))}],
});
const scene2xSelectedSnapshots = () => {
  const focused = scene4iLocalRotationTarget();
  if (focused && scene3kScope === 'active') return scene4iFocusedSnapshot(focused);
  return ({
  assets: scene2cGetGroupAssets().map(({presetName, asset}) => ({
    presetName, assetId: asset.id,
    before: cloneAssetTransform(ensureAssetTransform(asset)),
  })),
  slides: getSelectedSlideEntries()
    .filter(({slideState}) => !scenePreviewUi.hideSlideObjects && !scene2oIsSlideHidden(slideState.id) && slideState.mesh && !slideState.mesh.isDisposed())
    .map(({slideState}) => ({
      slideId: slideState.id,
      before: createSlideTransformHistorySnapshot(slideState),
    })),
});
};
// Scene-4I hotfix: the virtual Gizmo must use the same Group anchor as
// numeric Transform. The former center-only calculation made Local Group
// rotations orbit the selection center even when Active Object was chosen.
// Read the active position from the drag snapshot (not mutable live state)
// so the anchor remains stable throughout a gesture.
const scene2xPivotCenter = snapshot => {
  const positions = [
    ...snapshot.slides.map(x => x.before.position),
    ...snapshot.assets.map(x => x.before.position),
  ];
  const center = scene2vAveragePosition(positions);
  if (scene2wSelectionPivotMode !== 'group' || scene2vGroupAnchor !== 'active') return center;
  const active = scene3cGetExplicitActive();
  const kind = active?.kind ?? scene2uChooseActiveKind();
  if (kind === 'slide') {
    const slideId = active?.kind === 'slide' ? active.slideState.id : getSlideGizmoTargetEntry()?.slideState?.id;
    const match = snapshot.slides.find(entry => entry.slideId === slideId);
    if (match) return match.before.position.clone();
  } else if (kind === 'asset') {
    const assetId = active?.kind === 'asset' ? active.asset.id : getSelectedSceneAssetConfig()?.id;
    const match = snapshot.assets.find(entry =>
      entry.presetName === (active?.kind === 'asset' ? active.presetName : editingScenePresetName) && entry.assetId === assetId);
    if (match) return Vector3.FromArray(match.before.position);
  }
  // A stale inspector focus must not rotate around an unselected object.
  return center;
};
const scene2xShouldAttachPivot = () =>
  Boolean(scene4iLocalRotationTarget()) ||
  (isEditorMode() && !scenePreviewUi.previewName &&
  scene2wSelectionPivotMode === 'group' &&
  (getSelectedSlideEntries().filter(({slideState}) => !scenePreviewUi.hideSlideObjects && !scene2oIsSlideHidden(slideState.id)).length +
    scene2cGetGroupAssets().length) > 1);
const scene2xDisposePivot = () => {
  if (scene2xPivotNode && !scene2xPivotNode.isDisposed()) scene2xPivotNode.dispose();
  scene2xPivotNode = null;
};
const scene2xEnsurePivot = () => {
  if (!scene2xShouldAttachPivot() || !scene) return null;
  const snapshot = scene2xSelectedSnapshots();
  const center = scene2xPivotCenter(snapshot);
  if (!center) return null;
  if (scene2xPivotNode?.isDisposed() || scene2xPivotNode?.getScene() !== scene) {
    scene2xPivotNode = null;
  }
  if (!scene2xPivotNode) {
    scene2xPivotNode = new TransformNode('editor-selection-virtual-pivot', scene);
    scene2xPivotNode.rotationQuaternion = Quaternion.Identity();
    scene2xPivotNode.isPickable = false;
  }
  if (!scene2xPivotDrag) {
    scene2xPivotNode.position.copyFrom(center);
    // For Local coordinates, align the virtual handle with the active object.
    // The drag delta is still computed from this orientation's start snapshot.
    const explicit = scene3cGetExplicitActive();
    const kind = explicit?.kind ?? scene2uChooseActiveKind();
    const isLocal = kind === 'slide'
      ? slideGizmoCoordinateMode === 'local' : assetGizmoCoordinateMode === 'local';
    const focusedSlide = explicit?.kind === 'slide' ? explicit.slideState : getSlideGizmoTargetEntry()?.slideState;
    const focusedAsset = explicit?.kind === 'asset' ? explicit.asset : getSelectedSceneAssetConfig();
    const orientation = isLocal && kind === 'slide' && focusedSlide
      ? focusedSlide.rotationQuaternion
      : isLocal && kind === 'asset' && focusedAsset
        ? quaternionFromArray(ensureAssetTransform(focusedAsset).rotation)
        : Quaternion.Identity();
    scene2xPivotNode.rotationQuaternion.copyFrom(orientation);
    scene2xPivotNode.scaling.set(1, 1, 1);
    scene2xPivotNode.computeWorldMatrix(true);
  }
  return scene2xPivotNode;
};
const scene2xStartPivotDrag = mode => {
  if (!scene2xPivotNode || scene2xPivotNode.isDisposed()) return false;
  const snapshot = scene2xSelectedSnapshots();
  if (!scene2xPivotCenter(snapshot)) return false;
  scene4iPivotCancelled = false;
  scene2xPivotDrag = {
    ...snapshot, mode, presetName: editingScenePresetName,
    localRotationProxy: Boolean(scene4iLocalRotationTarget()),
    position: scene2xPivotNode.position.clone(),
    rotation: scene2xPivotNode.rotationQuaternion?.clone() ?? Quaternion.Identity(),
    scaling: scene2xPivotNode.scaling.clone(),
  };
  return true;
};
const scene2xApplyPivotDrag = () => {
  const edit = scene2xPivotDrag, pivotNode = scene2xPivotNode;
  if (!edit || !pivotNode || pivotNode.isDisposed()) return;
  const origin = edit.position;
  const translation = pivotNode.position.subtract(origin);
  const deltaRotation = (pivotNode.rotationQuaternion?.clone() ??
    Quaternion.FromEulerAngles(pivotNode.rotation.x, pivotNode.rotation.y, pivotNode.rotation.z))
    .multiply(edit.rotation.clone().conjugate()).normalize();
  const ratios = [pivotNode.scaling.x / edit.scaling.x,
    pivotNode.scaling.y / edit.scaling.y, pivotNode.scaling.z / edit.scaling.z];
  if (ratios.some(n => !Number.isFinite(n) || n <= 0)) return;
  const transformPosition = p => {
    const original = Vector3.FromArray(Array.isArray(p) ? p : p.asArray());
    if (edit.mode === 'position') return original.add(translation);
    if (edit.mode === 'rotation') {
      if (edit.localRotationProxy && scene2wSelectionPivotMode === 'individual') return original;
      return origin.add(original.subtract(origin).applyRotationQuaternion(deltaRotation));
    }
    if (edit.mode === 'scale') return Vector3.FromArray(scalePositionAboutPivot(original.asArray(), origin.asArray(), ratios, 'group'));
    return original;
  };
  for (const {slideId, before} of edit.slides) {
    const slide = slideStates.find(item => item.id === slideId);
    if (!slide) continue;
    slide.position = transformPosition(before.position);
    if (edit.mode === 'rotation') {
      slide.rotationQuaternion = deltaRotation.multiply(before.rotationQuaternion).normalize();
      syncCameraPoseAfterSlideTransform(slide, before);
    } else {
      slide.cameraPosition = Vector3.FromArray(followSlideTranslation(
        before.cameraPosition.asArray(), before.position.asArray(), slide.position.asArray()));
      if (edit.mode === 'scale') {
        const initial = normalizeSlideScale(before.slideScale);
        slide.slideScale = {x:initial.x * ratios[0], y:initial.y * ratios[1], z:initial.z * ratios[2]};
      }
    }
    applySlideTransformStateToMesh(slide);
  }
  for (const {presetName, assetId, before} of edit.assets) {
    const asset = getScenePresetConfigByName(presetName)?.assets?.find(item => item.id === assetId);
    if (!asset) continue;
    const next = cloneAssetTransform(before);
    next.position = transformPosition(before.position).asArray();
    if (edit.mode === 'rotation') {
      next.rotation = quaternionToArray(deltaRotation.multiply(
        quaternionFromArray(before.rotation, [0,0,0,1])).normalize());
    } else if (edit.mode === 'scale') {
      next.scale = multiplyScale(before.scale, ratios);
    }
    asset.transform = next;
    const loaded = getLoadedAssetByPresetAndId(presetName, assetId);
    if (loaded?.rootNode) {
      applyAssetTransform(loaded.rootNode, asset);
      loaded.rootNode.computeWorldMatrix(true);
    }
  }
};
// Escape restores the complete drag-start snapshot, without adding history.
// A later drag-end notification must not commit the cancelled gesture.
const scene4iCancelPivotDrag = () => {
  const edit = scene2xPivotDrag;
  if (!edit) return false;
  scene2xPivotDrag = null;
  scene4iPivotCancelled = true;
  for (const {slideId,before} of edit.slides) {
    const slide = slideStates.find(item=>item.id === slideId);
    if (!slide) continue;
    slide.position = before.position.clone();
    slide.cameraPosition = before.cameraPosition.clone();
    slide.rotationQuaternion = before.rotationQuaternion.clone();
    slide.cameraRotation = before.cameraRotation.clone();
    slide.slideScale = normalizeSlideScale(before.slideScale);
    applySlideTransformStateToMesh(slide);
  }
  for (const {presetName,assetId,before} of edit.assets) {
    const asset = getScenePresetConfigByName(presetName)?.assets?.find(item=>item.id===assetId);
    if (!asset) continue;
    asset.transform = cloneAssetTransform(before);
    const loaded = getLoadedAssetByPresetAndId(presetName,assetId);
    if (loaded?.rootNode) applyAssetTransform(loaded.rootNode,asset);
  }
  scene2xEnsurePivot();
  scene3cRefreshAbsolute();
  refreshSharedTransformControls();
  refreshSelectedAssetTransformInputs();
  renderTable();
  restoreCameraControlAfterGizmo();
  return true;
};
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !scene2xPivotDrag) return;
  event.preventDefault();
  event.stopPropagation();
  scene4iCancelPivotDrag();
}, true);
const scene2xEndPivotDrag = () => {
  if (!scene2xPivotDrag) return;
  scene2xApplyPivotDrag();
  scene2cCommitGroup(scene2xPivotDrag);
  scene2xPivotDrag = null;
  scene3cRefreshAbsolute();
  // Recalculate pivot from the final selection position only once the drag ends.
  scene2xEnsurePivot();
  refreshSharedTransformControls();
  refreshSelectedAssetTransformInputs();
  renderTable();
};
const scene2xRefreshPivotAttachment = () => {
  if (scene2xPivotDrag) return;
  if (!scene2xShouldAttachPivot()) {
    // Detach *before* disposing the node to avoid stale Babylon attachments.
    if (activeSlideGizmoManager?.attachedNode === scene2xPivotNode) activeSlideGizmoManager.attachToNode(null);
    if (activeGizmoManager?.attachedNode === scene2xPivotNode) activeGizmoManager.attachToNode(null);
    scene2xDisposePivot();
    if (activeSlideGizmoManager && slideGizmoMode !== 'off') attachGizmoToCurrentSlide();
    if (activeGizmoManager && assetGizmoMode !== 'off') syncEditingSceneAssetGizmo();
    return;
  }
  const pivot = scene2xEnsurePivot();
  if (!pivot) return;
  if (activeSlideGizmoManager && slideGizmoMode !== 'off') {
    activeSlideGizmoManager.attachToNode(pivot);
    applySlideGizmoCoordinateMode();
    applySlideGizmoSnap();
  } else if (activeGizmoManager && assetGizmoMode !== 'off') {
    activeGizmoManager.attachToNode(pivot);
    applyAssetGizmoCoordinateMode();
    applyAssetGizmoSnap();
  }
};

const registerAssetGizmoDragBehavior = function (dragBehavior) {
  if (!dragBehavior) return;
  dragBehavior.onDragStartObservable.add(() => {
    scene4iPivotCancelled = false;
    if (scene2xShouldAttachPivot() && scene2xStartPivotDrag(assetGizmoMode)) {
      scene2cGizmoGroupEdit = null;
      suspendCameraControlForGizmo();
      return;
    }
    scene2cGizmoGroupEdit = scene2cBeginGroup();
    assetTransformBeforeEdit = null;
    suspendCameraControlForGizmo();
  });
  dragBehavior.onDragObservable.add(() => {
    if (scene4iPivotCancelled) return;
    if (scene2xPivotDrag) {scene2xApplyPivotDrag(); scene3cRefreshAbsolute(); return;}
    syncSelectedAssetFromGizmo();
    scene2cUpdateGroup(scene2cGizmoGroupEdit);
    scene3cRefreshAbsolute();
  });
  dragBehavior.onDragEndObservable.add(() => {
    if (scene4iPivotCancelled) { scene4iPivotCancelled = false; restoreCameraControlAfterGizmo(); return; }
    if (scene2xPivotDrag) {
      scene2xEndPivotDrag();
      restoreCameraControlAfterGizmo();
      return;
    }
    syncSelectedAssetFromGizmo();
    scene2cUpdateGroup(scene2cGizmoGroupEdit);
    scene2cCommitGroup(scene2cGizmoGroupEdit);
    scene2cGizmoGroupEdit = null;
    refreshSelectedAssetTransformInputs();
    scene3cRefreshAbsolute();
    restoreCameraControlAfterGizmo();
  });
};

// Scene-3W: Snap options are rendered by scene2vSyncControls in the shared inspector.
const refreshAssetGizmoSnapUi = function () {};

const applyAssetGizmoSnap = function () {
  if (!activeGizmoManager) {
    return;
  }

  const positionGizmo = activeGizmoManager.gizmos.positionGizmo;

  const rotationGizmo = activeGizmoManager.gizmos.rotationGizmo;

  const scaleGizmo = activeGizmoManager.gizmos.scaleGizmo;

  // =============================
  // Snap OFF
  // =============================

  if (!assetGizmoSnapEnabled) {
    setPositionGizmoSnap(positionGizmo, 0);

    setRotationGizmoSnap(rotationGizmo, 0);

    setScaleGizmoSnap(scaleGizmo, 0);

    return;
  }

  // =============================
  // Snap ON
  // =============================

  switch (assetGizmoMode) {
    case "position":
      setPositionGizmoSnap(positionGizmo, assetGizmoSnapValues.position);

      break;

    case "rotation":
      setRotationGizmoSnap(
        rotationGizmo,

        degToRad(assetGizmoSnapValues.rotation),
      );

      break;

    case "scale":
      setScaleGizmoSnap(scaleGizmo, assetGizmoSnapValues.scale);

      break;
  }
};

const applyAssetGizmoCoordinateMode = function () {
  if (!activeGizmoManager) {
    return;
  }

  const isLocal = assetGizmoCoordinateMode === "local";

  const positionGizmo = activeGizmoManager.gizmos.positionGizmo;

  const rotationGizmo = activeGizmoManager.gizmos.rotationGizmo;
  const scaleGizmo = activeGizmoManager.gizmos.scaleGizmo;

  // Scene-4G: Scale is deliberately local-only. World/Local applies to
  // Move and Rotate, never to the Scale gizmo (GLB / SPZ / Slide alike).
  if (scaleGizmo) scaleGizmo.updateGizmoRotationToMatchAttachedMesh = true;

  // =====================================
  // Position
  // =====================================

  if (positionGizmo) {
    positionGizmo.updateGizmoRotationToMatchAttachedMesh = isLocal;
  }

  // =====================================
  // Rotation
  // =====================================

  if (rotationGizmo) {
    // Scene-4H hotfix: Babylon cannot attach a mesh-aligned rotation gizmo
    // to a node whose world transform contains non-uniform scale.
    // Use world-aligned handles as a safe fallback until the uniform-scale
    // proxy/pivot rotation path is implemented.
    const node = activeGizmoManager.attachedNode;
    if (node && typeof node.computeWorldMatrix === "function") node.computeWorldMatrix(true);
    const worldScale = new Vector3(1, 1, 1);
    if (node?.getWorldMatrix) node.getWorldMatrix().decompose(worldScale);
    rotationGizmo.updateGizmoRotationToMatchAttachedMesh =
      isLocal && (node === scene2xPivotNode || canMatchLocalRotation(worldScale));
  }
};

// Scene-3W: World/Local highlighting is owned by the shared inspector.
const refreshAssetGizmoCoordinateUi = function () {};

const refreshAssetUniformScaleUi = function () {
  const asset = getSelectedSceneAssetConfig();

  if (!asset) {
    assetUniformScaleCheck.disabled = true;
    assetUniformScaleInput.disabled = true;
    return;
  }

  const transform = ensureAssetTransform(asset);
  const scale = transform.scale;
  const isUniform = isUniformScaleArray(scale);

  // Asset自体がnon-uniformなら
  // 一旦UniformをOFFにする
  if (!isUniform) {
    assetUniformScaleEnabled = false;
  }

  assetUniformScaleCheck.disabled = false;
  assetUniformScaleCheck.setAttribute("aria-pressed", String(assetUniformScaleEnabled));
  assetUniformScaleCheck.setAttribute("aria-label", assetUniformScaleEnabled ? "Unlink scale axes" : "Link scale axes");
  const linkedLabel = assetUniformScaleCheck.querySelector(".asset-link-label");
  if (linkedLabel) linkedLabel.textContent = assetUniformScaleEnabled ? "Linked axes" : "Independent axes";
  assetUniformScaleInput.disabled = !assetUniformScaleEnabled;

  if (isUniform) {
    assetUniformScaleInput.value = Number(scale[0]).toFixed(3);
  } else {
    assetUniformScaleInput.value = "";
  }

  // XYZ個別入力
  assetScaleX.disabled = assetUniformScaleEnabled;
  assetScaleY.disabled = assetUniformScaleEnabled;
  assetScaleZ.disabled = assetUniformScaleEnabled;

};

const updateSelectedAssetUniformScale = function () {
  if (!assetUniformScaleEnabled) {
    return;
  }

  const asset = getSelectedSceneAssetConfig();

  if (!asset) {
    return;
  }

  const rawValue = Number(assetUniformScaleInput.value);

  if (!Number.isFinite(rawValue)) {
    return;
  }

  const value = Math.max(MIN_ASSET_SCALE, rawValue);

  if (!Number.isFinite(value)) {
    return;
  }

  const transform = ensureAssetTransform(asset);

  transform.scale = [value, value, value];

  applySelectedAssetTransform();

  refreshSelectedAssetTransformInputs();
};

// undo, redo
const getCurrentScenePresetName = function () {
  const slideState = getCurrentSlideState();

  if (!slideState || !currentProjectData) {
    return null;
  }

  const resolved = resolveScenePreset(currentProjectData, slideState);

  return resolved.name;
};


const beginSettingsEdit = function () {
  if (!currentProjectData || editorHistoryBusy || isPresentationMode()) return null;
  return {project: currentProjectData, before: captureSettings(currentProjectData, slideStates, presentationSettings), editingPreset: editingScenePresetName, presetEditors: refreshPresetEditors.readSelection?.()};
};

const finishSettingsEdit = function (edit) {
  if (!edit || currentProjectData !== edit.project || editorHistoryBusy) return;
  const changes = diffSettings(edit.before, captureSettings(currentProjectData, slideStates, presentationSettings));
  if (!changes.length) return;
  pushEditorHistory({type: "project-settings", changes, editingBefore: edit.editingPreset, editingAfter: editingScenePresetName, presetEditorsBefore: edit.presetEditors, presetEditorsAfter: refreshPresetEditors.readSelection?.()});
  refreshSlideSettingsInspector();
  scheduleProjectStatusRefresh();
};

const applySettingsHistoryState = async function (item, phase) {
  const target = {project: currentProjectData, presentation: presentationSettings, slides: Object.fromEntries(slideStates.map(slide => [slide.id, slide]))};
  applySettingsPatch(target, item.changes, phase);
  if (JSON.stringify(item.presetEditorsBefore) !== JSON.stringify(item.presetEditorsAfter)) refreshPresetEditors.restoreSelection?.(phase === "before" ? item.presetEditorsBefore : item.presetEditorsAfter);
  if (item.editingBefore !== item.editingAfter) editingScenePresetName = phase === "before" ? item.editingBefore : item.editingAfter;
  // A structural preset edit invalidates cached config references and pending loads.
  const sceneChanged = item.changes.some(change => change.path[0] === "project" && change.path[1] === "scenePresets");
  if (sceneChanged) {
    detachAssetGizmo();
    for (const cached of scenePresetAssetCache.values()) disposeScenePresetLoadResult(cached);
    resetScenePresetRuntime();
  }
  projectAudioCache.clear();
  try {
    if (getCurrentSlideState()) await activateScenePreset(getCurrentSlideState());
    await applyCurrentEnvironment();
  } catch (error) {
    // The data was restored; missing external assets must not lose its history entry.
    console.error("Settings restored; scene refresh failed", error);
    showAppNotice(t("Settings restored; some assets could not be refreshed."), {level: "warning"});
  }
  refreshEditingScenePresetSelector();
  refreshSharedPresetControls();
  refreshPresentationSettingsUi();
  refreshProjectBgmUi();
  refreshMultiSoundOverrideControls();
  dirtyMultiInspectorFields.clear();
  refreshSharedSlideSettingsContextUi();
  syncEnvironmentUi(getEnvironmentForEditorDisplay());
  syncSkyboxEditorFromEnvironment();
  scheduleProjectStatusRefresh();
  return true;
};

const pushEditorHistory = function (historyItem) {
  editorUndoStack.push(historyItem);

  if (editorUndoStack.length > MAX_EDITOR_HISTORY) {
    editorUndoStack.shift();
  }

  // 新しい編集をしたら
  // Redo履歴は無効
  editorRedoStack.length = 0;

  refreshUndoRedoUi();
};

const recordAssetTransformHistory = function (assetConfig, before, after) {
  if (!assetConfig || !before || !after) {
    return;
  }

  if (assetTransformsEqual(before, after)) {
    return;
  }

  const presetName = editingScenePresetName;

  if (!presetName) {
    return;
  }

  pushEditorHistory({
    type: "asset-transform",

    presetName: presetName,

    assetId: assetConfig.id,

    before: cloneAssetTransform(before),

    after: cloneAssetTransform(after),
  });
};

const findAssetConfigByHistory = function (historyItem) {
  const preset = getScenePresetSafe(currentProjectData, historyItem.presetName);

  if (!preset) {
    return null;
  }

  return (
    preset.assets?.find((asset) => asset.id === historyItem.assetId) ?? null
  );
};

const findLoadedAssetByHistory = function (historyItem) {
  const cachedPreset = scenePresetAssetCache.get(historyItem.presetName);

  if (!cachedPreset) {
    return null;
  }

  return (
    cachedPreset.assets?.find(
      (loadedAsset) => loadedAsset.config?.id === historyItem.assetId,
    ) ?? null
  );
};

const applyAssetTransformHistoryState = function (historyItem, transformState) {
  const assetConfig = findAssetConfigByHistory(historyItem);

  if (!assetConfig) {
    console.warn("Undo/Redo asset not found:", historyItem);

    return false;
  }

  assetConfig.transform = cloneAssetTransform(transformState);

  const loadedAsset = findLoadedAssetByHistory(historyItem);

  if (loadedAsset && loadedAsset.rootNode) {
    applyAssetTransform(loadedAsset.rootNode, assetConfig);
    loadedAsset.rootNode.computeWorldMatrix(true);
  }

  // 現在選択しているAssetなら
  // Inspectorも更新
  if (
    editingScenePresetName === historyItem.presetName &&
    selectedSceneAssetId === assetConfig.id
  ) {
    refreshSelectedAssetTransformInputs();
    // Focused range inputs normally resist updates during a live drag;
    // history replay must instead show the restored quaternion immediately.
    for (const axis of ["Pitch", "Yaw", "Roll"]) {
      const numberInput = document.getElementById(`assetRotation${axis}`);
      const rangeInput = document.getElementById(`assetRotation${axis}Slider`);
      if (rangeInput && numberInput && Number.isFinite(Number(numberInput.value))) {
        rangeInput.value = String(Math.max(-180, Math.min(180, Number(numberInput.value))));
      }
    }
    refreshAssetUniformScaleUi();
  }

  return true;
};

const initializeUsedSceneAssetIds = function () {
  usedSceneAssetIds.clear();

  const scenePresets = currentProjectData?.scenePresets ?? {};

  for (const preset of Object.values(scenePresets)) {
    for (const asset of preset.assets ?? []) {
      if (asset.id) {
        usedSceneAssetIds.add(asset.id);
      }
    }
  }
};

const undoSlidePresetBatch = async function (historyItem) {
  const propertyName = historyItem.propertyName;

  if (!isValidSlidePresetProperty(propertyName)) {
    return false;
  }

  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    slideState[propertyName] = change.before;
  }

  await refreshAfterSlidePresetBatch(propertyName, historyItem.changes);

  return true;
};

const redoSlidePresetBatch = async function (historyItem) {
  const propertyName = historyItem.propertyName;

  if (!isValidSlidePresetProperty(propertyName)) {
    return false;
  }

  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    slideState[propertyName] = change.after;
  }

  await refreshAfterSlidePresetBatch(propertyName, historyItem.changes);

  return true;
};

const undoSlideReorder = async function (historyItem) {
  applySlideOrderByIds(historyItem.beforeOrder);

  // =====================================
  // Current復元
  // =====================================

  if (historyItem.currentSlideId != null) {
    restoreCurrentSlideIndexById(historyItem.currentSlideId);
  }

  // =====================================
  // Selection復元
  // =====================================

  if (Array.isArray(historyItem.selectedSlideIds)) {
    selectedSlideIds.clear();

    for (const id of historyItem.selectedSlideIds) {
      if (slideStates.some((slideState) => slideState.id === id)) {
        selectedSlideIds.add(id);
      }
    }
  }

  ensureCurrentSlideSelected();
  slideSelectionAnchorIndex = currentSlideIndex;

  await refreshAfterSlideReorderBatch();

  return true;
};

const redoSlideReorder = async function (historyItem) {
  applySlideOrderByIds(historyItem.afterOrder);

  if (historyItem.currentSlideId != null) {
    restoreCurrentSlideIndexById(historyItem.currentSlideId);
  }

  if (Array.isArray(historyItem.selectedSlideIds)) {
    selectedSlideIds.clear();

    for (const id of historyItem.selectedSlideIds) {
      if (slideStates.some((slideState) => slideState.id === id)) {
        selectedSlideIds.add(id);
      }
    }
  }

  ensureCurrentSlideSelected();
  slideSelectionAnchorIndex = currentSlideIndex;

  await refreshAfterSlideReorderBatch();

  return true;
};

const undoSlideEnvironmentOverrideBatch = async function (historyItem) {
  const propertyName = historyItem.propertyName;

  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    if (!slideState.environmentOverride) {
      slideState.environmentOverride = {};
    }

    if (change.before === undefined) {
      delete slideState.environmentOverride[propertyName];
    } else {
      slideState.environmentOverride[propertyName] = structuredClone(
        change.before,
      );
    }
  }

  // await refreshAfterEnvironmentOverrideBatch(historyItem.changes);

  return true;
};

const redoSlideEnvironmentOverrideBatch = async function (historyItem) {
  const propertyName = historyItem.propertyName;

  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    if (!slideState.environmentOverride) {
      slideState.environmentOverride = {};
    }

    slideState.environmentOverride[propertyName] = structuredClone(
      change.after,
    );
  }

  // await refreshAfterEnvironmentOverrideBatch(historyItem.changes);

  return true;
};

const undoClearEnvironmentOverridesBatch = async function (historyItem) {
  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    slideState.environmentOverride = structuredClone(change.before);
  }

  // await refreshAfterEnvironmentOverrideBatch(historyItem.changes);

  return true;
};

const redoClearEnvironmentOverridesBatch = async function (historyItem) {
  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    slideState.environmentOverride = {};
  }

  // await refreshAfterEnvironmentOverrideBatch(historyItem.changes);

  return true;
};

const restoreCurrentAndSelectionByIds = function (
  currentSlideId,
  selectionIds,
) {
  // =====================================
  // Selection
  // =====================================

  selectedSlideIds.clear();

  for (const id of selectionIds ?? []) {
    const exists = slideStates.some((slideState) => slideState.id === id);

    if (exists) {
      selectedSlideIds.add(id);
    }
  }

  // =====================================
  // Current
  // =====================================

  if (currentSlideId != null) {
    const index = slideStates.findIndex(
      (slideState) => slideState.id === currentSlideId,
    );

    if (index >= 0) {
      currentSlideIndex = index;
    }
  }

  // Scene-1S: history restores Current and selection as a consistent pair.
  ensureCurrentSlideSelected();

  slideSelectionAnchorIndex = currentSlideIndex;
};

const undoSlideSoundOverrideBatch = async function (historyItem) {
  const propertyName = historyItem.propertyName;

  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    if (!slideState.soundOverride) {
      slideState.soundOverride = {};
    }

    if (change.before === undefined) {
      delete slideState.soundOverride[propertyName];
    } else {
      slideState.soundOverride[propertyName] = structuredClone(change.before);
    }
  }

  return true;
};

const redoSlideSoundOverrideBatch = async function (historyItem) {
  const propertyName = historyItem.propertyName;

  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    if (!slideState.soundOverride) {
      slideState.soundOverride = {};
    }

    if (change.after === undefined) {
      delete slideState.soundOverride[propertyName];
    } else {
      slideState.soundOverride[propertyName] = structuredClone(change.after);
    }
  }

  return true;
};

const undoClearSoundOverridesBatch = async function (historyItem) {
  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    slideState.soundOverride = structuredClone(change.before);
  }

  return true;
};

const redoClearSoundOverridesBatch = async function (historyItem) {
  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    slideState.soundOverride = {};
  }

  return true;
};

const undoSlideMultiPropertyBatch = async function (historyItem) {
  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    const override = getSlideOverrideObject(slideState, change.group);

    if (!override) {
      continue;
    }

    if (change.before === undefined) {
      delete override[change.propertyName];
    } else {
      override[change.propertyName] = structuredClone(change.before);
    }
  }

  return true;
};

const redoSlideMultiPropertyBatch = async function (historyItem) {
  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    const override = getSlideOverrideObject(slideState, change.group);

    if (!override) {
      continue;
    }

    if (change.after === undefined) {
      delete override[change.propertyName];
    } else {
      override[change.propertyName] = structuredClone(change.after);
    }
  }

  return true;
};

const applySlideTransformBatchHistoryState = async function (
  historyItem,
  stateName,
) {
  let appliedCount = 0;

  for (const change of historyItem.changes) {
    const slideState = slideStates.find((item) => item.id === change.slideId);

    if (!slideState) {
      continue;
    }

    const state = change[stateName];

    if (!state) {
      continue;
    }

    slideState.position = state.position.clone();

    slideState.rotationQuaternion = state.rotationQuaternion.clone();

    slideState.slideScale = normalizeSlideScale(state.slideScale);

    slideState.cameraPosition = state.cameraPosition.clone();

    slideState.cameraRotation = state.cameraRotation.clone();

    applySlideTransformStateToMesh(slideState);

    appliedCount++;
  }

  if (appliedCount === 0) {
    return false;
  }

  await refreshAfterSlideTransformBatch();
  // Undo/Redo must synchronize even a focused range input.
  refreshSharedTransformControls({ forceRotationSliders: true, forceScaleSliders: true });

  return true;
};

const applySlideDrawingHistory = function (historyItem, direction) {
  for (const change of historyItem.changes ?? []) {
    const slide = slideStates.find(item => item.id === change.slideId);
    if (!slide) return false;
  }
  for (const change of historyItem.changes ?? []) {
    const slide = slideStates.find(item => item.id === change.slideId);
    slide.drawings = structuredClone(change[direction]);
    slideDrawing.refreshSlide(slide);
  }
  scheduleProjectStatusRefresh();
  return true;
};

// Effects-1J: reversible Scene / Slide atmosphere editing.
// Capture stable target IDs, not the currently-selected editor object, so
// undo/redo also works after the user switches Scene or Slide.
function atmosphereHistorySnapshot(scope, targetId) {
  if (scope === 'scene') {
    const scenePreset = currentProjectData?.scenePresets?.[targetId];
    if (!scenePreset) return null;
    return { settings: normalizeAtmosphereEffects(scenePreset.atmosphereEffects) };
  }
  const slide = slideStates.find(item => item.id === targetId);
  if (!slide) return null;
  return {
    enabled: slide.atmosphereOverrideEnabled === true,
    // Preserve an absent override: toggling off must not silently create one.
    override: slide.atmosphereOverride ? normalizeAtmosphereEffects(slide.atmosphereOverride) : null,
  };
}
function atmosphereHistoryTarget(scope) {
  return scope === 'scene' ? editingScenePresetName : getCurrentSlideState()?.id ?? null;
}
function applyAtmosphereHistoryState(item, direction) {
  const state = item[direction];
  if (!state) return false;
  if (item.scope === 'scene') {
    const scenePreset = currentProjectData?.scenePresets?.[item.targetId];
    if (!scenePreset) return false;
    scenePreset.atmosphereEffects = normalizeAtmosphereEffects(state.settings);
  } else {
    const slide = slideStates.find(entry => entry.id === item.targetId);
    if (!slide) return false;
    slide.atmosphereOverrideEnabled = state.enabled === true;
    slide.atmosphereOverride = state.override ? normalizeAtmosphereEffects(state.override) : null;
  }
  refreshAtmosphereEffectsUI();
  refreshSlideAtmosphereEffectsUI();
  atmosphereEffectsController?.setSettings(getActiveSceneAtmosphereSettings());
  scheduleProjectStatusRefresh();
  return true;
}
function recordAtmosphereHistory(scope, targetId, before) {
  if (!before || !targetId || editorHistoryBusy) return false;
  const after = atmosphereHistorySnapshot(scope, targetId);
  if (!after || JSON.stringify(before) === JSON.stringify(after)) return false;
  pushEditorHistory({ type: 'atmosphere-settings', scope, targetId, before, after });
  return true;
}

const undoEditorAction = async function () {
  if (editorHistoryBusy || editorUndoStack.length === 0) {
    return;
  }
  editorHistoryBusy = true;

  const currentSlideIdBeforeUndo = getCurrentSlideState()?.id ?? null;

  const selectedSlideIdsBeforeUndo = [...selectedSlideIds];

  try {
    const historyItem = editorUndoStack.at(-1);

    let success = false;

    switch (historyItem.type) {
      case "screen-drawing":
        drawingController.setScreenStrokes(historyItem.before); success = true;
        break;
      case "slide-drawing":
        success = applySlideDrawingHistory(historyItem, "before");
        break;
      case "project-settings":
        success = await applySettingsHistoryState(historyItem, "before");
        break;
      case "camera-framing-offset":
        success = applyCameraFramingOffset(historyItem.before);
        break;
      case "atmosphere-settings":
        success = applyAtmosphereHistoryState(historyItem, "before");
        break;
      // =================================
      // Transform
      // =================================

      case "scene2c-group-transform":
        success = await scene2cReplayGroup(historyItem, "before");
        break;
      case "asset-transform":
        success = applyAssetTransformHistoryState(
          historyItem,
          historyItem.before,
        );

        break;

      // =================================
      // Asset追加 / 削除
      // =================================

      case "asset-presence":
        success = await applyAssetPresenceState(
          historyItem,
          historyItem.beforeExists,
        );

        break;

      case "asset-presence-batch":
        success = await applyAssetPresenceBatch(historyItem, historyItem.assets[0]?.beforeExists ?? false);
        break;

      case "slide-reorder":
        success = await undoSlideReorder(historyItem);

        break;

      case "slide-transform":
        success = applySlideTransformHistoryState(
          historyItem,
          historyItem.before,
        );

        break;

      case "slide-transparency":
        success = applySlideTransparencyHistoryState(historyItem, historyItem.before);
        break;

      case "slide-label":
        success = applySlideLabelHistoryState(historyItem, historyItem.before);

        break;

      case "slide-image":
        success = await applySlideImageHistoryState(
          historyItem,
          historyItem.beforeImagePath,
        );

        break;

      case "slide-image-batch":
        success = await applySlideImageBatchHistoryState(historyItem, 'before');
        break;

      case "slide-presence":
        success = await applySlidePresenceState(
          historyItem,
          historyItem.beforeExists,
          historyItem.selectedSlideIdBefore,
        );

        break;

      case "slide-presence-batch":
        success = await undoSlidePresenceBatch(historyItem);

        break;

      case "slide-preset-batch":
        success = await undoSlidePresetBatch(historyItem);

        break;

      case "slide-environment-override-batch":
        success = await undoSlideEnvironmentOverrideBatch(historyItem);

        break;

      case "slide-environment-override-clear-batch":
        success = await undoClearEnvironmentOverridesBatch(historyItem);

        break;

      case "scene1c-override-toggle":
        for (const change of historyItem.changes) {
          const slideState = slideStates.find(slide => slide.id === change.slideId);
          if (slideState) {
            if (change.before === undefined) delete slideState[historyItem.key];
            else slideState[historyItem.key] = change.before;
          }
        }
        success = true;
        break;
      case "slide-transition-override-batch":


        success = await undoSlideTransitionOverrideBatch(historyItem);

        break;

      case "slide-transition-override-clear-batch":
        success = await undoClearTransitionOverridesBatch(historyItem);

        break;

      case "slide-sound-override-batch":
        success = await undoSlideSoundOverrideBatch(historyItem);

        break;

      case "slide-sound-override-clear-batch":
        success = await undoClearSoundOverridesBatch(historyItem);

        break;

      case "slide-multi-property-batch":
        success = await undoSlideMultiPropertyBatch(historyItem);

        break;

      case "slide-transform-batch":
        success = await applySlideTransformBatchHistoryState(
          historyItem,
          "before",
        );

        break;

      case "slide-camera-batch":
        success = await applySlideCameraBatchHistoryState(
          historyItem,
          "before",
        );

        break;

      case "scene3o-glow-batch":
        success = scene3oRestoreGlowBatch(historyItem, "before");
        break;
      case "asset-glow":
        success = applyAssetGlowHistoryState(historyItem, historyItem.before);
        break;

      default:
        console.warn("Unknown undo history:", historyItem);

        success = false;
    }

    if (!success) {

      refreshUndoRedoUi();

      return;
    }

    // Asset Transform is a scene-object edit, never a camera navigation command.
    // An older slide transition target can otherwise resume after this history replay.
    if ((success && historyItem.type === "asset-transform" && camera) ||
        (success && historyItem.type === "scene2c-group-transform" && camera)) {
      cameraCurrentPosition = camera.position.clone();
      cameraEndPointPosition = camera.position.clone();
      const rotation = camera.rotationQuaternion?.clone() ?? Quaternion.FromEulerAngles(
        camera.rotation.x, camera.rotation.y, camera.rotation.z,
      );
      cameraCurrentRotation = rotation.clone();
      cameraEndPointRotation = rotation.clone();
      cameraControlViaKeyboard = false;
    }

    if (success && !historyControlsSlideSelection(historyItem)) {
      restoreCurrentAndSelectionByIds(
        currentSlideIdBeforeUndo,
        selectedSlideIdsBeforeUndo,
      );
    }

    if (historyItem.type === "slide-presence-batch") {
      await refreshAfterSlideReorderBatch();
    }

    if (success && isEnvironmentOverrideHistory(historyItem)) {
      await refreshAfterEnvironmentOverrideBatch(historyItem.changes);
    }

    if (success && isTransitionOverrideHistory(historyItem)) {
      await refreshAfterTransitionOverrideBatch(historyItem.changes);
    }

    if (success && isSoundOverrideHistory(historyItem)) {
      await refreshAfterSoundOverrideBatch(historyItem.changes);
    }

    if (success && isMultiPropertyBatchHistory(historyItem)) {
      await refreshAfterMultiPropertyBatch(historyItem.changes);
    }

    editorUndoStack.pop();
    editorRedoStack.push(historyItem);

    refreshAfterEditorHistory();
    if (typeof scene3cRefreshAbsolute === 'function') scene3cRefreshAbsolute();

    refreshUndoRedoUi();
  } finally {
    editorHistoryBusy = false;

    cleanupSlideSelection();

    refreshUndoRedoUi();
  }
};

const redoEditorAction = async function () {
  if (editorHistoryBusy || editorRedoStack.length === 0) {
    return;
  }

  editorHistoryBusy = true;

  const currentSlideIdBeforeRedo = getCurrentSlideState()?.id ?? null;

  const selectedSlideIdsBeforeRedo = [...selectedSlideIds];

  try {
    const historyItem = editorRedoStack.at(-1);

    let success = false;

    switch (historyItem.type) {
      case "screen-drawing":
        drawingController.setScreenStrokes(historyItem.after); success = true;
        break;
      case "slide-drawing":
        success = applySlideDrawingHistory(historyItem, "after");
        break;
      case "project-settings":
        success = await applySettingsHistoryState(historyItem, "after");
        break;
      case "camera-framing-offset":
        success = applyCameraFramingOffset(historyItem.after);
        break;
      case "atmosphere-settings":
        success = applyAtmosphereHistoryState(historyItem, "after");
        break;
      case "scene2c-group-transform":
        success = await scene2cReplayGroup(historyItem, "after");
        break;
      case "asset-transform":
        success = applyAssetTransformHistoryState(
          historyItem,
          historyItem.after,
        );

        break;

      case "asset-presence":
        success = await applyAssetPresenceState(
          historyItem,
          historyItem.afterExists,
        );

        break;

      case "asset-presence-batch":
        success = await applyAssetPresenceBatch(historyItem, historyItem.assets[0]?.afterExists ?? true);
        break;

      case "slide-reorder":
        success = await redoSlideReorder(historyItem);

        break;

      case "slide-transform":
        success = applySlideTransformHistoryState(
          historyItem,
          historyItem.after,
        );

        break;

      case "slide-transparency":
        success = applySlideTransparencyHistoryState(historyItem, historyItem.after);
        break;

      case "slide-label":
        success = applySlideLabelHistoryState(historyItem, historyItem.after);

        break;

      case "slide-image":
        success = await applySlideImageHistoryState(
          historyItem,
          historyItem.afterImagePath,
        );

        break;

      case "slide-image-batch":
        success = await applySlideImageBatchHistoryState(historyItem, 'after');
        break;

      case "slide-presence":
        success = await applySlidePresenceState(
          historyItem,
          historyItem.afterExists,
          historyItem.selectedSlideIdAfter,
        );

        break;

      case "slide-presence-batch":
        success = await redoSlidePresenceBatch(historyItem);

        break;

      case "slide-preset-batch":
        success = await redoSlidePresetBatch(historyItem);

        break;

      case "slide-environment-override-batch":
        success = await redoSlideEnvironmentOverrideBatch(historyItem);

        break;

      case "slide-environment-override-clear-batch":
        success = await redoClearEnvironmentOverridesBatch(historyItem);

        break;

      case "scene1c-override-toggle":
        for (const change of historyItem.changes) {
          const slideState = slideStates.find(slide => slide.id === change.slideId);
          if (slideState) {
            if (change.after === undefined) delete slideState[historyItem.key];
            else slideState[historyItem.key] = change.after;
          }
        }
        success = true;
        break;
      case "slide-transition-override-batch":


        success = await redoSlideTransitionOverrideBatch(historyItem);

        break;

      case "slide-transition-override-clear-batch":
        success = await redoClearTransitionOverridesBatch(historyItem);

        break;

      case "slide-sound-override-batch":
        success = await redoSlideSoundOverrideBatch(historyItem);

        break;

      case "slide-sound-override-clear-batch":
        success = await redoClearSoundOverridesBatch(historyItem);

        break;

      case "slide-multi-property-batch":
        success = await redoSlideMultiPropertyBatch(historyItem);

        break;

      case "slide-transform-batch":
        success = await applySlideTransformBatchHistoryState(
          historyItem,
          "after",
        );

        break;

      case "slide-camera-batch":
        success = await applySlideCameraBatchHistoryState(historyItem, "after");

        break;

      case "scene3o-glow-batch":
        success = scene3oRestoreGlowBatch(historyItem, "after");
        break;
      case "asset-glow":
        success = applyAssetGlowHistoryState(historyItem, historyItem.after);
        break;

      default:
        console.warn("Unknown redo history:", historyItem);

        success = false;
    }

    if (!success) {

      refreshUndoRedoUi();

      return;
    }

    // Asset Transform is a scene-object edit, never a camera navigation command.
    // An older slide transition target can otherwise resume after this history replay.
    if ((success && historyItem.type === "asset-transform" && camera) ||
        (success && historyItem.type === "scene2c-group-transform" && camera)) {
      cameraCurrentPosition = camera.position.clone();
      cameraEndPointPosition = camera.position.clone();
      const rotation = camera.rotationQuaternion?.clone() ?? Quaternion.FromEulerAngles(
        camera.rotation.x, camera.rotation.y, camera.rotation.z,
      );
      cameraCurrentRotation = rotation.clone();
      cameraEndPointRotation = rotation.clone();
      cameraControlViaKeyboard = false;
    }

    if (success && !historyControlsSlideSelection(historyItem)) {
      restoreCurrentAndSelectionByIds(
        currentSlideIdBeforeRedo,
        selectedSlideIdsBeforeRedo,
      );
    }

    if (historyItem.type === "slide-presence-batch") {
      await refreshAfterSlideReorderBatch();
    }

    if (success && isEnvironmentOverrideHistory(historyItem)) {
      await refreshAfterEnvironmentOverrideBatch(historyItem.changes);
    }

    if (success && isTransitionOverrideHistory(historyItem)) {
      await refreshAfterTransitionOverrideBatch(historyItem.changes);
    }

    if (success && isSoundOverrideHistory(historyItem)) {
      await refreshAfterSoundOverrideBatch(historyItem.changes);
    }

    if (success && isMultiPropertyBatchHistory(historyItem)) {
      await refreshAfterMultiPropertyBatch(historyItem.changes);
    }

    editorRedoStack.pop();
    editorUndoStack.push(historyItem);

    refreshAfterEditorHistory();
    if (typeof scene3cRefreshAbsolute === 'function') scene3cRefreshAbsolute();

    refreshUndoRedoUi();
  } finally {
    editorHistoryBusy = false;

    cleanupSlideSelection();

    refreshUndoRedoUi();
  }
};

const refreshUndoRedoUi = function () {
  undoEditorButton.disabled = editorHistoryBusy || editorUndoStack.length === 0;

  redoEditorButton.disabled = editorHistoryBusy || editorRedoStack.length === 0;

  undoEditorButton.textContent = `Undo (${editorUndoStack.length})`;

  redoEditorButton.textContent = `Redo (${editorRedoStack.length})`;
};

const clearEditorHistory = function () {
  editorUndoStack.length = 0;

  editorRedoStack.length = 0;

  assetTransformBeforeEdit = null;

  slideTransformBeforeGizmoEdit = null;

  slideOrderBeforeDrag = null;

  slideLabelBeforeEdit = null;

  editorHistoryBusy = false;

  copiedSlideSnapshots = [];

  refreshUndoRedoUi();
};

const beginAssetTransformNumericEdit = function () {
  const asset = getSelectedSceneAssetConfig();

  if (!asset || !editingScenePresetName) {
    assetTransformBeforeEdit = null;
    return;
  }

  assetTransformBeforeEdit = {
    presetName: editingScenePresetName,
    assetId: asset.id,
    transform: cloneAssetTransform(ensureAssetTransform(asset)),
  };
};

const commitAssetTransformNumericEdit = function () {
  const edit = assetTransformBeforeEdit;

  assetTransformBeforeEdit = null;

  if (!edit) {
    return;
  }

  const preset = getScenePresetConfigByName(edit.presetName);

  const asset = preset?.assets?.find((item) => item.id === edit.assetId);

  if (!asset) {
    return;
  }

  const after = cloneAssetTransform(ensureAssetTransform(asset));

  if (assetTransformsEqual(edit.transform, after)) {
    return;
  }

  pushEditorHistory({
    type: "asset-transform",
    presetName: edit.presetName,
    assetId: edit.assetId,
    before: edit.transform,
    after,
  });
};

const getLoadedAssetByPresetAndId = function (presetName, assetId) {
  const cachedPreset = scenePresetAssetCache.get(presetName);

  if (!cachedPreset) {
    return null;
  }

  return (
    cachedPreset.assets?.find(
      (loadedAsset) => loadedAsset.config?.id === assetId,
    ) ?? null
  );
};

const restoreLoadedAssetToScene = async function (presetName, assetConfig) {
  return await loadAndRegisterSceneAsset(assetConfig, presetName);
};

const applyAssetPresenceState = async function (historyItem, shouldExist) {
  const preset = getScenePresetConfigByName(historyItem.presetName);

  if (!preset) {
    console.warn("Preset not found:", historyItem.presetName);

    return false;
  }

  preset.assets ??= [];

  const existingIndex = preset.assets.findIndex(
    (asset) => asset.id === historyItem.assetId,
  );

  // =====================================
  // Assetを存在させる
  // =====================================

  if (shouldExist) {
    // すでに存在するなら何もしない
    if (existingIndex >= 0) {
      return true;
    }

    const restoredConfig = structuredClone(historyItem.assetConfig);

    insertAssetConfigAtIndex(preset, restoredConfig, historyItem.index);

    try {
      await restoreLoadedAssetToScene(historyItem.presetName, restoredConfig);
    } catch (error) {
      // Sceneへの復元失敗なら
      // Configも元へ戻す

      preset.assets = preset.assets.filter(
        (asset) => asset.id !== restoredConfig.id,
      );

      console.error("Asset restore failed:", error);

      return false;
    }

    if (editingScenePresetName === historyItem.presetName) {
      selectedSceneAssetId = restoredConfig.id;
    }

    return true;
  }

  // =====================================
  // Assetを存在させない
  // =====================================

  if (existingIndex < 0) {
    // すでに存在しない
    return true;
  }

  if (
    editingScenePresetName === historyItem.presetName &&
    selectedSceneAssetId === historyItem.assetId
  ) {
    detachAssetGizmo();
  }

  // Scene / Cache
  removeLoadedAssetFromScene(historyItem.presetName, historyItem.assetId);

  // Config
  preset.assets.splice(existingIndex, 1);

  if (
    editingScenePresetName === historyItem.presetName &&
    selectedSceneAssetId === historyItem.assetId
  ) {
    selectedSceneAssetId = null;
  }

  return true;
};

// Scene-2K: one Undo/Redo entry for all duplicated placed Assets.
// The replay also handles selected Assets belonging to several Scenes.
const applyAssetPresenceBatch = async function (historyItem, shouldExist) {
  // Reverse undo order to preserve original indices when several Assets share a Scene.
  const restoringOriginalState = shouldExist === Boolean(historyItem.assets[0]?.beforeExists);
  const items = restoringOriginalState ? [...historyItem.assets].reverse() : historyItem.assets;
  const completed = [];
  for (const item of items) {
    const success = await applyAssetPresenceState(item, shouldExist);
    if (!success) {
      // Keep the history stack consistent if an external asset cannot load.
      for (const done of completed.reverse()) {
        await applyAssetPresenceState(done, !shouldExist);
      }
      return false;
    }
    completed.push(item);
  }
  canvasSelectedAssetIds.clear();
  scene2fClearAssetSelection();
  if (shouldExist) {
    for (const item of historyItem.assets) scene2fSelectAsset(item.presetName, item.assetId);
    for (const id of canvasSelectedAssetKeys.get(editingScenePresetName) ?? []) {
      canvasSelectedAssetIds.add(id);
    }
    selectedSceneAssetId = [...canvasSelectedAssetIds].at(-1) ?? null;
  } else {
    selectedSceneAssetId = null;
  }
  return true;
};

const refreshAfterEditorHistory = function () {
  refreshPresetEditors();
  refreshSceneAssetEditor();

  refreshSlideSettingsInspector();

  refreshSlideManagementUi();

  refreshCurrentSlidePropertiesUi();

  renderTable();

  renderSlideThumbnails();

  // Asset Gizmo
  syncEditingSceneAssetGizmo();

  // Slide Gizmo
  if (slideGizmoMode !== "off" && getCurrentSlideState()?.mesh) {
    attachGizmoToCurrentSlide();
  } else {
    detachSlideGizmo();
  }
};

// Presetの管理
const isScenePresetNameAvailable = function (name) {
  if (!name || ["__proto__", "constructor", "prototype"].includes(name) || !currentProjectData) {
    return false;
  }

  return !Object.prototype.hasOwnProperty.call(
    currentProjectData.scenePresets ?? {},
    name,
  );
};

const createUniqueScenePresetName = function (baseName = "scene") {
  const presets = currentProjectData?.scenePresets ?? {};

  let candidate = baseName;

  let index = 2;

  while (Object.prototype.hasOwnProperty.call(presets, candidate)) {
    candidate = `${baseName}-${index}`;

    index++;
  }

  return candidate;
};

const createDefaultScenePreset = function () {
  return {
    assets: [],
    atmosphereEffects: normalizeAtmosphereEffects(),

    environment: {
      useSkybox: false,

      turbidity: 10,

      inclination: 0,

      azimuth: 0.5,

      fogColor: [0.75, 0.75, 0.75],

      fogDensity: 0.002,
    },
  };
};

const assignScenePresetToCurrentSlide = async function (presetName) {
  const slideState = getCurrentSlideState();

  if (!slideState) {
    return;
  }

  slideState.scenePreset = presetName;

  // Scene切替
  activeScenePresetName = null;

  await activateScenePreset(slideState);

  await applyCurrentEnvironment();

  selectedSceneAssetId = null;

  refreshSlideSettingsInspector();

  refreshSceneAssetEditor();

  if (assetGizmoMode !== "off" && getSelectedSceneAssetConfig()) {
    attachGizmoToSelectedAsset();
  }
};

const countSlidesUsingScenePreset = function (presetName) {
  return slideStates.filter(
    (slideState) => (slideState.scenePreset ?? "default") === presetName,
  ).length;
};

const getCurrentScenePresetEnvironment = function () {
  const preset = getEditingScenePresetConfig();

  if (!preset) {
    return null;
  }

  preset.environment ??= {};

  return preset.environment;
};

const getCurrentSlideEnvironmentOverride = function () {
  const slideState = getCurrentSlideState();

  if (!slideState) {
    return null;
  }

  slideState.environmentOverride ??= {};

  return slideState.environmentOverride;
};

const getEditableEnvironment = function () {
  if (environmentEditTarget === "preset") {
    return getCurrentScenePresetEnvironment();
  }

  return getCurrentSlideEnvironmentOverride();
};

const getEnvironmentForEditorDisplay = function () {
  if (environmentEditTarget === "preset") {
    return getCurrentScenePresetEnvironment() ?? {};
  }

  const slideState = getCurrentSlideState();

  if (!slideState) {
    return {};
  }

  return resolveEnvironment(currentProjectData, slideState);
};

const environmentSlideOverrideCheckbox = document.getElementById("environmentSlideOverrideCheckbox");
const slideEnvironmentOverrideEnabled = document.getElementById("slideEnvironmentOverrideEnabled");
const sharedEnvironmentEditor = document.getElementById("sharedEnvironmentEditor");
const sceneEnvironmentEditorHome = document.getElementById("sceneEnvironmentEditorHome");
const slideEnvironmentEditorHome = document.getElementById("slideEnvironmentEditorHome");
// Sky Mode is a presentation of the legacy useSkybox boolean. Keep the
// serialized field unchanged for backwards compatibility.
const skyModeProceduralButton = document.getElementById("skyModeProceduralButton");
const skyModeSkyboxButton = document.getElementById("skyModeSkyboxButton");
const proceduralSkySettings = document.getElementById("proceduralSkySettings");
const skyboxModeSettings = document.getElementById("skyboxModeSettings");
const syncSkyModeControls = () => {
  const env = getEnvironmentForEditorDisplay();
  const skybox = env?.useSkybox === true;
  if (proceduralSkySettings) proceduralSkySettings.hidden = skybox;
  if (skyboxModeSettings) skyboxModeSettings.hidden = !skybox;
  skyModeProceduralButton?.classList.toggle("active", !skybox);
  skyModeSkyboxButton?.classList.toggle("active", skybox);
  skyModeProceduralButton?.setAttribute("aria-pressed", String(!skybox));
  skyModeSkyboxButton?.setAttribute("aria-pressed", String(skybox));
};
const changeSkyMode = async (useSkybox) => {
  const env = getEditableEnvironment();
  if (!env) return;
  // Do not activate a skybox without a configured image set.
  let selectedSkybox = null;
  if (useSkybox && (env.useSkybox !== true || !env.skybox)) {
    // Inactive legacy face paths may be retained for historical compatibility,
    // but enabling Skybox again must use a currently registered choice.
    // Active legacy skyboxes are still allowed to render unchanged.
    const selected = getSelectedDetectedSkyboxSet() ?? getSkyboxChoicesForEditor()[0];
    if (selected?.skybox) selectedSkybox = structuredClone(selected.skybox);
    else {
      // No registered sets exist: reveal the picker, but never store an
      // invalid useSkybox=true or create an empty Undo item.
      refreshSkyboxEditorChoices();
      if (skyboxModeSettings) skyboxModeSettings.hidden = false;
      skyboxEditorStatus.textContent = t("No registered skyboxes");
      skyboxSetSelector?.focus();
      return;
    }
  }
  const edit = beginSettingsEdit();
  if (selectedSkybox) env.skybox = selectedSkybox;
  env.useSkybox = useSkybox;
  finishSettingsEdit(edit);
  syncSkyModeControls();
  if (useSkybox) skyboxEditorStatus.textContent = '';
  await applyCurrentEnvironment();
  refreshSlideSettingsInspector();
};
skyModeProceduralButton?.addEventListener("click", () => changeSkyMode(false));
skyModeSkyboxButton?.addEventListener("click", () => changeSkyMode(true));
const syncSlideEnvironmentEditor = () => {
  const inSlides = document.querySelector('[data-workspace-panel="slides"]')?.hidden === false;
  const destination = inSlides ? slideEnvironmentEditorHome : sceneEnvironmentEditorHome;
  if (destination && sharedEnvironmentEditor.parentElement !== destination) destination.append(sharedEnvironmentEditor);
  environmentEditTarget = inSlides ? "override" : "preset";
  const current = getCurrentSlideState();
  if (slideEnvironmentOverrideEnabled) {
    slideEnvironmentOverrideEnabled.disabled = !current;
    slideEnvironmentOverrideEnabled.checked = Boolean(current && (current.environmentOverride?.__enabled === true || (current.environmentOverride?.__enabled !== false && Object.keys(current.environmentOverride ?? {}).some(k => k !== "__enabled"))));
  }
  const customDetails = document.getElementById('slideEnvironmentCustomDetails');
  if (customDetails) { customDetails.hidden = false; customDetails.disabled = inSlides && !slideEnvironmentOverrideEnabled?.checked; }
  if (sharedEnvironmentEditor) sharedEnvironmentEditor.hidden = false;
  refreshEnvironmentEditTargetUi();
  syncEnvironmentUi(getEnvironmentForEditorDisplay());
  syncSkyboxEditorFromEnvironment();
  syncSkyModeControls();
};
// Keep one authoritative set of editor controls, relocating it when the workspace changes.
document.querySelectorAll('[data-workspace-tab]').forEach(tab => tab.addEventListener('click', () => queueMicrotask(syncSlideEnvironmentEditor)));
document.querySelectorAll('[data-workspace-link]').forEach(link => link.addEventListener('click', () => queueMicrotask(syncSlideEnvironmentEditor)));
const environmentSlideStatusObserver = new MutationObserver(() => {
  if (!document.querySelector('[data-workspace-panel="slides"]')?.hidden) queueMicrotask(syncSlideEnvironmentEditor);
});
const slideInspectorTitleNode = document.getElementById('slideInspectorTitle');
if (slideInspectorTitleNode) environmentSlideStatusObserver.observe(slideInspectorTitleNode, {childList: true, characterData: true, subtree: true});
const environmentPanelObserver = new MutationObserver(() => queueMicrotask(syncSlideEnvironmentEditor));
for (const name of ['slides', 'scene']) {
  const panel = document.querySelector(`[data-workspace-panel="${name}"]`);
  if (panel) environmentPanelObserver.observe(panel, {attributes:true, attributeFilter:['hidden']});
}
queueMicrotask(syncSlideEnvironmentEditor);
slideEnvironmentOverrideEnabled?.addEventListener('change', async () => {
  const slide = getCurrentSlideState();
  if (!slide) return;
  const edit = beginSettingsEdit();
  slide.environmentOverride ??= {};
  if (slideEnvironmentOverrideEnabled.checked) {
    // Re-enable previously edited values; initialize from the current effective Scene if blank.
    if (!Object.keys(slide.environmentOverride).some(k => k !== '__enabled')) {
      slide.environmentOverride = structuredClone(resolveScenePreset(currentProjectData, slide).preset?.environment ?? {});
    }
    slide.environmentOverride.__enabled = true;
  } else {
    slide.environmentOverride.__enabled = false;
  }
  finishSettingsEdit(edit);
  refreshMultiSlideActionButtons();
  syncSlideEnvironmentEditor();
  await applyCurrentEnvironment();
  refreshSlideSettingsInspector();
});
const skyInspectorSection = editEnvironmentPresetButton.closest("details.inspector-section");
const refreshEnvironmentEditTargetUi = function () {
  if (environmentSlideOverrideCheckbox) environmentSlideOverrideCheckbox.checked = environmentEditTarget === "override";
  editEnvironmentPresetButton.classList.toggle(
    "active",
    environmentEditTarget === "preset",
  );

  editEnvironmentOverrideButton.classList.toggle(
    "active",
    environmentEditTarget === "override",
  );
};

const listSkyboxImageFiles = async function () {
  if (!currentProjectDirectoryHandle) {
    return [];
  }

  let skyboxDirectory;

  try {
    skyboxDirectory =
      await currentProjectDirectoryHandle.getDirectoryHandle("skybox");
  } catch (error) {
    if (error.name === "NotFoundError") {
      return [];
    }

    throw error;
  }

  const files = [];

  for await (const entry of skyboxDirectory.values()) {
    if (entry.kind !== "file") {
      continue;
    }

    const lower = entry.name.toLowerCase();

    if (
      !lower.endsWith(".jpg") &&
      !lower.endsWith(".jpeg") &&
      !lower.endsWith(".png") &&
      !lower.endsWith(".webp")
    ) {
      continue;
    }

    files.push(entry.name);
  }

  files.sort((a, b) => a.localeCompare(b));

  return files;
};

// Scene and Slide share one editor. Selectors contain registered library
// entries, with a temporary legacy choice for an active unregistered skybox.
const getSkyboxChoicesForEditor = () => {
  const environment = getEnvironmentForEditorDisplay();
  // Preserve *active* historical assignments, but do not offer an old,
  // inactive, unregistered skybox as a selectable library entry.
  const activeFaces = environment?.useSkybox === true ? environment.skybox : null;
  return skyboxEditorChoices(currentProjectData?.skyboxLibrary, activeFaces);
};

const refreshSkyboxEditorChoices = () => {
  if (!skyboxSetSelector) return;
  const environment = getEnvironmentForEditorDisplay();
  const activeFaces = environment?.useSkybox === true ? environment.skybox : null;
  const choices = getSkyboxChoicesForEditor();
  const selected = skyboxEditorSelectedValue(choices, activeFaces) || choices[0]?.value || '';
  const fragment = document.createDocumentFragment();
  if (!choices.length) {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = t('No registered skyboxes');
    fragment.appendChild(empty);
  }
  for (const item of choices) {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.legacy ? t('Current unregistered skybox') : item.name;
    fragment.appendChild(option);
  }
  skyboxSetSelector.replaceChildren(fragment);
  // A previous "No registered skyboxes" hint must not survive registration.
  // The picker options are refreshed independently of its status text.
  if (choices.length && skyboxEditorStatus.textContent === t('No registered skyboxes')) {
    skyboxEditorStatus.textContent = '';
  }
  skyboxSetSelector.disabled = !choices.length;
  skyboxSetSelector.value = selected;
  refreshSelectedSkyboxSetInfo();
};

const refreshSkyboxSetSelector = async function () {
  // The library manager still scans disk for new six-face registrations,
  // but the Environment picker exposes only registered entries.
  const generation = ++skyboxSetRefreshGeneration;
  const targetDirectory = currentProjectDirectoryHandle;
  const targetProject = currentProjectData;
  if (!targetDirectory) {
    detectedSkyboxSets = [];
    availableSkyboxFiles = null;
    availableSkyboxFilesProject = null;
    refreshSkyboxEditorChoices();
    return;
  }
  try {
    const files = await listSkyboxImageFiles();
    if (generation !== skyboxSetRefreshGeneration ||
        currentProjectDirectoryHandle !== targetDirectory ||
        currentProjectData !== targetProject) return;
    detectedSkyboxSets = detectSkyboxSets(files);
    availableSkyboxFiles = files;
    availableSkyboxFilesProject = targetProject;
  } catch (error) {
    if (generation !== skyboxSetRefreshGeneration ||
        currentProjectDirectoryHandle !== targetDirectory ||
        currentProjectData !== targetProject) return;
    console.error('Skybox file listing failed:', error);
    detectedSkyboxSets = [];
    availableSkyboxFiles = null;
    availableSkyboxFilesProject = null;
    skyboxEditorStatus.textContent = t('Skybox scan failed');
  }
  refreshSkyboxEditorChoices();
};

const getSelectedDetectedSkyboxSet = function () {
  return getSkyboxChoicesForEditor().find(item => item.value === skyboxSetSelector.value) ?? null;
};

const refreshSelectedSkyboxSetInfo = function () {
  const skybox = getSelectedDetectedSkyboxSet()?.skybox;
  skyboxPathPx.textContent = skybox?.px ?? '-';
  skyboxPathPy.textContent = skybox?.py ?? '-';
  skyboxPathPz.textContent = skybox?.pz ?? '-';
  skyboxPathNx.textContent = skybox?.nx ?? '-';
  skyboxPathNy.textContent = skybox?.ny ?? '-';
  skyboxPathNz.textContent = skybox?.nz ?? '-';
};

const syncSkyboxEditorFromEnvironment = function () {
  refreshSkyboxEditorChoices();
};

// スライド
// スライド
////////////////////
////////////////////////////////////////
const initializeNextSlideId = function () {
  let maxId = -1;

  for (const slide of slideStates) {
    const id = Number(slide.id);

    if (Number.isFinite(id)) {
      maxId = Math.max(maxId, id);
    }
  }

  nextSlideId = maxId + 1;
};

const createUniqueSlideId = function () {
  const id = nextSlideId;

  nextSlideId++;

  return id;
};

const refreshSlideManagementUi = function () {
  refreshInspectorContextUi();
  refreshSlideNavigationIndicator();
  const hasSlide =
    currentSlideIndex >= 0 && currentSlideIndex < slideStates.length;

  const hasOperationTarget = getSlideOperationTargetEntries().length > 0;

  duplicateSlideButton.disabled = !hasOperationTarget;

  deleteSlideButton.disabled = !hasOperationTarget;

  moveSlideEarlierButton.disabled = !canMoveSlideTargetsLeft();

  moveSlideLaterButton.disabled = !canMoveSlideTargetsRight();

  if (!hasSlide) {
    currentSlidePositionLabel.textContent = `0 / ${slideStates.length}`;

    refreshToolbarCurrentSlideStatus();

    return;
  }

  currentSlidePositionLabel.textContent = `${currentSlideIndex + 1} / ${slideStates.length}`;

  refreshToolbarCurrentSlideStatus();
};

const cloneSlideMeshForState = function (sourceState, newState) {
  if (!sourceState.mesh) {
    return null;
  }

  const sourceMesh = sourceState.mesh;

  // =====================================
  // Mesh Clone
  // =====================================

  const clonedMesh = sourceMesh.clone(`slide-${newState.id}`);

  if (!clonedMesh) {
    return null;
  }

  // =====================================
  // Material Clone
  // =====================================

  const sourceMaterial = sourceMesh.material;

  if (sourceMaterial) {
    // =====================================
    // Material Clone
    // =====================================

    const clonedMaterial = sourceMaterial.clone(
      `slide-material-${newState.id}`,
    );

    if (!clonedMaterial) {
      console.warn("Slide material clone failed:", newState.id);

      clonedMesh.dispose(false, false);
      return null;
    }

    // =====================================
    // Texture Clone
    // =====================================

    const sourceTexture = sourceMaterial.diffuseTexture;

    if (sourceTexture) {
      const clonedTexture = sourceTexture.clone();

      if (!clonedTexture) {
        console.warn("Slide texture clone failed:", newState.id);

        // 共有Textureを破棄しない
        clonedMaterial.diffuseTexture = null;
        clonedMaterial.dispose();

        clonedMesh.dispose(false, false);

        return null;
      }

      clonedMaterial.diffuseTexture = clonedTexture;
    }

    // =====================================
    // Assign
    // =====================================

    clonedMesh.material = clonedMaterial;
  }

  // =====================================
  // Transform
  // =====================================

  clonedMesh.position = newState.position.clone();

  clonedMesh.rotationQuaternion = newState.rotationQuaternion.clone();

  // =====================================
  // State
  // =====================================

  newState.mesh = clonedMesh;

  // Materialは専用
  // Textureは共有される可能性がある

  // =====================================
  // Image URL references
  // =====================================

  // 複製したTextureが参照するURLを引き継ぐ
  newState.imageUrl = sourceState.imageUrl ?? null;

  newState.activeImageUrl =
    sourceState.activeImageUrl ?? sourceState.imageUrl ?? null;

  // =====================================
  // Glow
  // =====================================

  if (activeGlowLayer) {
    registerSlideGlowOccluder(activeGlowLayer, clonedMesh);
  }

  return clonedMesh;
};

// Drawing-1C: render each slide as an opaque, non-emissive depth occluder
// in the GlowLayer source pass. addExcludedMesh is not suitable here: it also
// removes the slide from the glow pass depth buffer, allowing glow behind the
// slide to bleed through the annotation strokes in the final additive merge.
const slideGlowOccluderMaterials = new WeakMap();
const registerSlideGlowOccluder = function (glowLayer, mesh) {
  if (!glowLayer || !mesh) return;
  const scene = mesh.getScene();
  let occluder = slideGlowOccluderMaterials.get(glowLayer);
  if (!occluder) {
    occluder = new StandardMaterial("slide-glow-depth-occluder", scene);
    occluder.diffuseColor = Color3.Black();
    occluder.emissiveColor = Color3.Black();
    occluder.specularColor = Color3.Black();
    occluder.disableLighting = true;
    occluder.backFaceCulling = false;
    occluder.forceDepthWrite = true;
    slideGlowOccluderMaterials.set(glowLayer, occluder);
  }
  glowLayer.removeExcludedMesh(mesh);
  glowLayer.setMaterialForRendering(mesh, occluder);
};
const unregisterSlideGlowOccluder = function (glowLayer, mesh) {
  if (!glowLayer || !mesh) return;
  glowLayer.setMaterialForRendering(mesh, undefined);
};

const disposeSlideStateMesh = function (slideState, { glowLayer = null } = {}) {
  const mesh = slideState?.mesh;

  if (!mesh) {
    return;
  }

  // =====================================
  // Scene / GlowLayer
  // =====================================

  const meshScene = !mesh.isDisposed() ? mesh.getScene() : null;

  // 明示指定されたGlowLayerを優先する。
  // 通常はactiveGlowLayerを使用する。
  const candidateGlowLayer = glowLayer ?? activeGlowLayer;

  // 異なるSceneのGlowLayerを操作しない。
  const targetGlowLayer =
    candidateGlowLayer &&
    meshScene &&
    (glowLayer !== null || activeGlowLayer === candidateGlowLayer)
      ? candidateGlowLayer
      : null;

  if (targetGlowLayer) {
    try {
      unregisterSlideGlowOccluder(targetGlowLayer, mesh);
    } catch (error) {
      console.debug("GlowLayer occluder cleanup skipped:", error);
    }
  }

  // =====================================
  // Mesh / Material / Texture
  // =====================================

  if (!mesh.isDisposed()) {
    mesh.dispose(false, true);
  }

  slideState.mesh = null;
};

const slideTransparentPresentationCheckbox = document.getElementById("slideTransparentPresentationCheckbox");
const refreshCurrentSlidePropertiesUi = function () {
  const slideState = getCurrentSlideState();

  const hasSlide = !!slideState;
  if (slideTransparentPresentationCheckbox) {
    slideTransparentPresentationCheckbox.disabled = !hasSlide;
    slideTransparentPresentationCheckbox.checked = slideState?.transparentInPresentation === true;
  }

  const inputs = [slideLabelInput];

  for (const element of inputs) {
    element.disabled = !hasSlide;
  }

  if (!slideState) {
    slideOrderDisplay.textContent = "-";

    slideIdDisplay.textContent = "-";

    slideFilenameDisplay.textContent = "-";

    slideLabelInput.value = "";

    slideImageIdInput.value = "";

    slideImageIdInput.disabled = true;

    applySlideImageIdButton.disabled = true;
    if (chooseSlideImageButton) chooseSlideImageButton.disabled = true;

    return;
  }

  // =====================================
  // Metadata
  // =====================================

  slideOrderDisplay.textContent = `${currentSlideIndex + 1} / ${slideStates.length}`;

  slideIdDisplay.textContent = String(slideState.id ?? "");

  slideLabelInput.value = slideState.label ?? "";

  slideFilenameDisplay.textContent = extractFilenameFromPath(
    slideState.imagePath,
  );

  slideFilenameDisplay.title = slideState.imagePath ?? ""; // slideFilenameDisplay.textContent;

  // =====================================
  // Image
  // =====================================

  slideImageIdInput.disabled = false;

  applySlideImageIdButton.disabled = false;
  if (chooseSlideImageButton) chooseSlideImageButton.disabled = false;

  const imageId = extractImageIdFromSlideImagePath(slideState.imagePath);

  slideImageIdInput.value = imageId !== null ? String(imageId) : "";
};

const syncCameraPoseAfterSlideTransform = function (slideState, before) {
  if (!slideState || !before) {
    return;
  }

  const oldPosition = before.position;
  const oldRotation = before.rotationQuaternion;
  const oldCameraPosition = before.cameraPosition;
  const oldCameraRotation = before.cameraRotation;

  if (
    !oldPosition ||
    !oldRotation ||
    !oldCameraPosition ||
    !oldCameraRotation
  ) {
    syncCameraPoseToSlide(slideState);
    return;
  }

  // 変更前のスライド姿勢の逆回転
  const inverseOldRotation = oldRotation.clone().normalize().conjugate();

  // カメラ位置を旧スライドのローカル座標で表現
  const localCameraOffset = oldCameraPosition
    .subtract(oldPosition)
    .applyRotationQuaternion(inverseOldRotation);

  // 新スライドの姿勢へ変換
  const newRotation = slideState.rotationQuaternion.clone().normalize();

  slideState.cameraPosition = slideState.position.add(
    localCameraOffset.applyRotationQuaternion(newRotation),
  );

  // カメラの相対回転も維持
  const relativeCameraRotation = inverseOldRotation
    .multiply(oldCameraRotation)
    .normalize();

  slideState.cameraRotation = newRotation
    .multiply(relativeCameraRotation)
    .normalize();
};

const slideImageFileExists = async function (imagePath) {
  const normalizedPath = normalizeSlideImagePath(imagePath);

  if (!normalizedPath || !currentProjectDirectoryHandle) {
    return false;
  }

  try {
    await getProjectFile(currentProjectDirectoryHandle, normalizedPath);

    return true;
  } catch (error) {
    if (error?.name === "NotFoundError") {
      return false;
    }

    // getProjectFileが独自Errorを投げる場合もあるので
    console.warn("Slide image check failed:", normalizedPath, error);

    return false;
  }
};

// Look for case-insensitive Slide image names, obeying the user-defined
// filename priority BEFORE image extension priority (PNG before JPG).
const resolveSlideImagePathFromId = async function (imageId, directoryHandle = currentProjectDirectoryHandle) {
  if (!directoryHandle) return null;
  let folder;
  try { folder = await directoryHandle.getDirectoryHandle('slides'); }
  catch (error) { if (error?.name === 'NotFoundError') return null; throw error; }
  const available = new Map();
  for await (const [name, entry] of folder.entries()) {
    if (entry.kind === 'file') available.set(name.toLowerCase(), name);
  }
  for (const name of slideImageNameCandidates(imageId)) {
    const actual = available.get(name.toLowerCase());
    if (actual) return `slides/${actual}`;
  }
  return null;
};

const createSlideImageUrl = async function (imagePath) {
  const normalizedPath = normalizeSlideImagePath(imagePath);

  if (!normalizedPath) {
    throw new Error("Invalid slide imagePath");
  }

  return await createProjectFileUrl(
    currentProjectDirectoryHandle,
    normalizedPath,
    activeProjectObjectUrls,
  );
};

const replaceSlideMeshImage = async function (slideState, imageUrl) {
  if (!slideState?.mesh) {
    return;
  }

  const mesh = slideState.mesh;

  const material = mesh.material;

  if (!material) {
    console.warn("Slide material is unavailable:", slideState.id);
    return;
  }

  // =====================================
  // 旧Resource
  // =====================================

  const oldTexture = mesh.material.diffuseTexture ?? null;

  const oldImageUrl = slideState.activeImageUrl ?? null;

  // =====================================
  // 新Texture
  // =====================================

  const newTexture = applySlideTextureToMaterial(
    mesh.material,
    imageUrl,
    scene,
  );

  slideState.activeImageUrl = imageUrl;

  // =====================================
  // 新Resourceへの切替後に
  // 旧Resourceを破棄
  // =====================================

  if (oldTexture && oldTexture !== newTexture) {
    oldTexture.dispose();
  }

  if (oldImageUrl && oldImageUrl !== imageUrl) {
    releaseSlideImageUrlIfUnused(oldImageUrl, {
      excludeSlideState: slideState,
    });
  }
};

// Slideごとの画像変更リクエスト番号
const slideImageChangeVersions = new WeakMap();

const beginSlideImageChange = function (slideState) {
  const nextVersion = (slideImageChangeVersions.get(slideState) ?? 0) + 1;

  slideImageChangeVersions.set(slideState, nextVersion);

  return nextVersion;
};

const isSlideImageChangeCurrent = function (
  slideState,
  version,
  targetMesh,
  targetScene,
  targetProject,
) {
  return (
    slideImageChangeVersions.get(slideState) === version &&
    slideStates.includes(slideState) &&
    slideState.mesh === targetMesh &&
    !!targetMesh &&
    !targetMesh.isDisposed() &&
    scene === targetScene &&
    currentProjectData === targetProject
  );
};

const changeSlideImage = async function (slideState, imagePath) {
  if (!slideState) {
    return false;
  }

  const normalizedPath = normalizeSlideImagePath(imagePath);

  if (!normalizedPath) {
    return await applySlideImageHistoryState({ slideId: slideState.id }, null);
  }

  // =====================================
  // Request version
  // =====================================

  const version = beginSlideImageChange(slideState);

  const targetMesh = slideState.mesh;
  const targetScene = scene;
  const targetProject = currentProjectData;
  const targetUrlSet = activeProjectObjectUrls;

  const isCurrent = () =>
    isSlideImageChangeCurrent(
      slideState,
      version,
      targetMesh,
      targetScene,
      targetProject,
    ) && activeProjectObjectUrls === targetUrlSet;

  // =====================================
  // File existence
  // =====================================

  const exists = await slideImageFileExists(normalizedPath);

  // 待機中に別操作が行われた場合
  if (!isCurrent()) {
    return false;
  }

  if (!exists) {
    // Keep the image ID even before the corresponding file has been added.
    // A missing image uses the red fallback and is still a valid history state.
    const material = slideState.mesh?.material;
    if (!material) return false;
    const oldTexture = material.diffuseTexture ?? null;
    const oldImageUrl = slideState.activeImageUrl ?? null;
    applySlideImageMaterialState(slideState, material, targetScene, {
      imagePath: normalizedPath, imageUrl: null,
    });
    slideState.imagePath = normalizedPath;
    if (oldTexture) oldTexture.dispose();
    if (oldImageUrl) releaseSlideImageUrlIfUnused(oldImageUrl, { excludeSlideState: slideState });
    showAppNotice(`${t('No matching slide image for ID')}: ${extractImageIdFromSlideImagePath(normalizedPath) ?? normalizedPath}`, {
      level: 'warning', key: `change-slide-image:${normalizedPath}`, 
    });
    return true;
  }

  // =====================================
  // Create URL
  // =====================================

  const imageUrl = await createSlideImageUrl(normalizedPath);

  // URL生成中に別操作が行われた場合
  if (!isCurrent()) {
    revokeOwnedObjectUrl(targetUrlSet, imageUrl);
    return false;
  }

  // =====================================
  // Apply image
  // =====================================

  try {
    await replaceSlideMeshImage(slideState, imageUrl);
  } catch (error) {
    revokeOwnedObjectUrl(targetUrlSet, imageUrl);
    throw error;
  }

  // =====================================
  // State
  // =====================================

  slideState.imagePath = normalizedPath;
  slideState.imageUrl = imageUrl;

  return true;
};

const placeCurrentSlideInFrontOfCamera = function () {
  const slideState = getCurrentSlideState();

  if (!slideState || !camera) {
    return;
  }

  const distance = cameraRadiusInit;

  // =====================================
  // Camera Pose
  // =====================================

  const cameraPosition = camera.position.clone();

  const cameraRotation =
    camera.rotationQuaternion?.clone() ?? Quaternion.Identity();

  const forward = camera.getDirection(Vector3.Forward());

  // =====================================
  // SlideをCamera前へ
  // =====================================

  slideState.position = cameraPosition.add(forward.scale(distance));

  // Cameraと同じ姿勢
  slideState.rotationQuaternion = cameraRotation.clone();

  // =====================================
  // Camera PoseもこのSlide用に保存
  // =====================================

  slideState.cameraPosition = cameraPosition;

  slideState.cameraRotation = cameraRotation;

  // =====================================
  // Mesh
  // =====================================

  if (slideState.mesh) {
    slideState.mesh.position.copyFrom(slideState.position);

    slideState.mesh.rotationQuaternion = slideState.rotationQuaternion.clone();

    slideState.mesh.rotation.set(0, 0, 0);

    slideState.mesh.computeWorldMatrix(true);
  }

  // =====================================
  // UI
  // =====================================

  refreshCurrentSlidePropertiesUi();

  renderTable();

  refreshCurrentSlideGizmoAfterTransform();
  // if (slideGizmoMode !== "off") {
  //   attachGizmoToCurrentSlide();
  // }
};

const moveOnlyCurrentSlideInFrontOfCamera = function () {
  if (!getCurrentSlideState() || projectOperationBusy || editorHistoryBusy || isPresentationMode()) return false;
  setSingleSlideSelection(currentSlideIndex);
  refreshSlideSelectionUi();
  refreshSlideManagementUi();
  const changed = placeCurrentSlideInFrontOfCameraWithHistory();
  if (changed) {
    renderSlideThumbnails();
    refreshCurrentSlidePropertiesUi();
  }
  return changed;
};

const placeCurrentSlideInFrontOfCameraWithHistory = function () {
  const slideState = getCurrentSlideState();

  if (!slideState) {
    return false;
  }

  const before = cloneSlideTransformHistoryState(slideState);

  placeCurrentSlideInFrontOfCamera();

  const after = cloneSlideTransformHistoryState(slideState);

  recordSlideTransformHistory(slideState, before, after);

  return true;
};

const refreshTransparentSlideEditorMaterial = function (slideState) {
  // Do not replace loaded textures or a red missing-image warning.
  if (slideState?.imagePath || !slideState?.mesh?.material) return;
  applySlideFallbackMaterial(
    slideState.mesh.material,
    slideState.transparentInPresentation ? "transparent" : "unassigned",
  );
};

const applySlideTransparencyHistoryState = function (historyItem, enabled) {
  const slideState = findSlideStateById(historyItem.slideId);
  if (!slideState) return false;
  slideState.transparentInPresentation = enabled === true;
  refreshTransparentSlideEditorMaterial(slideState);
  if (getCurrentSlideState() === slideState && slideTransparentPresentationCheckbox) {
    slideTransparentPresentationCheckbox.checked = slideState.transparentInPresentation;
  }
  scenePreviewUi.guidesSignature = null;
  refreshEditorVisualGuides();
  return true;
};

const applySlideLabelHistoryState = function (historyItem, label) {
  const slideState = findSlideStateById(historyItem.slideId);

  if (!slideState) {
    console.warn("Undo/Redo Slide not found:", historyItem.slideId);

    return false;
  }

  slideState.label = String(label ?? "");

  if (getCurrentSlideState() === slideState) {
    slideLabelInput.value = slideState.label;
  }

  return true;
};

const applySlideImageHistoryState = async function (historyItem, imagePath) {
  const slideState = findSlideStateById(historyItem.slideId);

  if (!slideState) {
    console.warn("Undo/Redo Slide not found:", historyItem.slideId);
    return false;
  }

  const normalizedPath = normalizeSlideImagePath(imagePath);

  // =====================================
  // 画像未設定への復元
  // =====================================

  if (!normalizedPath) {
    // 進行中の画像変更リクエストを無効化
    beginSlideImageChange(slideState);

    const material = slideState.mesh?.material;

    if (!material) {
      return false;
    }

    const oldTexture = material.diffuseTexture ?? null;
    const oldImageUrl = slideState.activeImageUrl ?? null;

    // 共通Fallback設定
    applySlideImageMaterialState(
      slideState,
      material,
      slideState.mesh.getScene(),
      {
        imagePath: null,
        imageUrl: null,
      },
    );

    slideState.imagePath = null;

    // 旧Textureを破棄
    if (oldTexture) {
      oldTexture.dispose();
    }

    // 旧Object URLを解放
    if (oldImageUrl) {
      releaseSlideImageUrlIfUnused(oldImageUrl, {
        excludeSlideState: slideState,
      });
    }

    return true;
  }

  // =====================================
  // 画像が設定されている状態への復元
  // =====================================

  return await changeSlideImage(slideState, normalizedPath);
};

// Improve-1B: one history item for selected slides; restores null as well as missing IDs.
const applySlideImageBatchHistoryState = async function (historyItem, phase) {
  let success = true;
  for (const item of historyItem.changes ?? []) {
    const result = await applySlideImageHistoryState(
      { slideId: item.slideId }, phase === 'before' ? item.beforeImagePath : item.afterImagePath,
    );
    if (!result) success = false;
  }
  return success;
};

const resolveScenePreset = function (projectData, slideState) {
  const safeProjectData = projectData ?? createDefaultProjectData();

  const presets = safeProjectData.scenePresets ?? {};

  const requestedPresetName = slideState?.scenePreset ?? "default";

  // 指定されたPresetが存在する
  if (presets[requestedPresetName]) {
    return {
      name: requestedPresetName,

      preset: presets[requestedPresetName],
    };
  }

  // 存在しなければdefaultへfallback
  if (presets.default) {
    console.warn(
      `Scene preset "${requestedPresetName}" ` +
        `was not found. Using "default".`,
    );

    showAppNotice(
      `ScenePreset "${requestedPresetName}" が見つからないため default を使用します。`,
      {
        level: "info",
        duration: 4000,
        key: `resolve-scene-preset:${requestedPresetName}`,
      },
    );

    return {
      name: "default",

      preset: presets.default,
    };
  }

  // defaultすら無い場合
  console.warn("No scene preset was found. " + "Using an empty scene preset.");

  showAppNotice(
    "No scene preset was found. " + "Using an empty scene preset.",
    {
      level: "info",
      duration: 4000,
    },
  );

  return {
    name: "default",

    preset: {
      assets: [],
      environment: {},
    },
  };
};

const resolveEnvironment = function (projectData, slideState) {
  const defaultEnvironment = {
    useSkybox: false,

    turbidity: 10,

    inclination: 0,

    azimuth: 0.5,

    fogColor: [0.75, 0.75, 0.75],

    fogDensity: 0.002,
  };

  const resolvedScenePreset = resolveScenePreset(projectData, slideState);

  const presetEnvironment = resolvedScenePreset.preset?.environment ?? {};

  const override =
    slideState?.environmentOverride &&
    typeof slideState.environmentOverride === "object"
      ? slideState.environmentOverride
      : {};

  const { __enabled, ...overrideValues } = override;
  return {
    ...defaultEnvironment,
    ...presetEnvironment,
    ...(__enabled === false ? {} : overrideValues),
  };
};

const resolveSceneAssets = function (projectData, slideState) {
  const resolved = resolveScenePreset(projectData, slideState);

  const assets = resolved.preset?.assets;

  return Array.isArray(assets) ? assets : [];
};

const resolveSceneState = function (projectData, slideState) {
  const resolvedPreset = resolveScenePreset(projectData, slideState);

  const environment = resolveEnvironment(projectData, slideState);

  const assets = Array.isArray(resolvedPreset.preset?.assets)
    ? resolvedPreset.preset.assets
    : [];

  return {
    presetName: resolvedPreset.name,

    environment: environment,

    assets: assets,
  };
};

const createSlideStateFromData = function (data, index) {
  const transform = data?.transform ?? {};

  const cameraData = data?.camera ?? {};

  // =====================================
  // Image
  // =====================================

  const rawImagePath = data?.imagePath ?? "";

  const imagePath = normalizeSlideImagePath(rawImagePath);

  return {
    id: Number.isFinite(Number(data?.id)) ? Number(data.id) : index,

    label: data?.label ?? "",

    imagePath: imagePath,
    transparentInPresentation: data?.transparentInPresentation === true,

    // -------------------------
    // Scale
    // -------------------------

    slideScale: normalizeSlideScale(data?.slideScale),

    drawings: structuredClone(Array.isArray(data?.drawings) ? data.drawings : []),

    // -------------------------
    // Slide Transform
    // -------------------------

    position: vector3FromArray(transform.position, [0, 2, 0]),

    rotationQuaternion: quaternionFromArray(transform.rotation, [0, 0, 0, 1]),

    // -------------------------
    // Camera Transform
    // -------------------------

    cameraPosition: vector3FromArray(cameraData.position, [0, 2, -1.2]),

    cameraRotation: quaternionFromArray(cameraData.rotation, [0, 0, 0, 1]),

    // -------------------------
    // Scene
    // -------------------------

    scenePreset: data?.scenePreset ?? "default",

    environmentOverride:
      data?.environmentOverride && typeof data.environmentOverride === "object"
        ? {
            ...data.environmentOverride,
          }
        : {},
    atmosphereOverrideEnabled: data?.atmosphereOverrideEnabled === true,
    atmosphereOverride: data?.atmosphereOverride && typeof data.atmosphereOverride === "object"
      ? normalizeAtmosphereEffects(data.atmosphereOverride)
      : undefined,

    // -------------------------
    // Transition
    // -------------------------

    transitionPreset: data?.transitionPreset ?? "default",

    transitionOverride:
      data?.transitionOverride && typeof data.transitionOverride === "object"
        ? {
            ...data.transitionOverride,
          }
        : {},

    // -------------------------
    // Sound
    // -------------------------

    soundPreset: data?.soundPreset ?? "default",

    transitionOverrideEnabled: typeof data?.transitionOverrideEnabled === "boolean" ? data.transitionOverrideEnabled : undefined,
    transitionOverrideMode: ["preset", "custom"].includes(data?.transitionOverrideMode) ? data.transitionOverrideMode : undefined,
    soundOverrideEnabled: typeof data?.soundOverrideEnabled === "boolean" ? data.soundOverrideEnabled : undefined,
    soundOverrideMode: ["preset", "custom"].includes(data?.soundOverrideMode) ? data.soundOverrideMode : undefined,
    soundOverride:
      data?.soundOverride && typeof data.soundOverride === "object"
        ? {
            ...data.soundOverride,
          }
        : {},

    bgmOverride: normalizeSlideBgmOverride(data?.bgmOverride),

    autoPlayOverride: normalizeSlideAutoPlayOverride(data?.autoPlayOverride),

    interaction: normalizeSlideInteraction(data),
    action: normalizeSlideInteraction(data).type === "open-url" ? normalizeSlideInteraction(data).url : "",

    // Runtime
    imageUrl: null,

    mesh: null,
  };
};

const createSlideStatesFromProjectData = function (projectData) {
  return projectData.slides.map((slideData, index) =>
    createSlideStateFromData(slideData, index),
  );
};

const createSlidePlaneAndMaterial = function (slideState, targetScene) {
  // =====================================
  // Plane
  // =====================================

  const slideMesh = MeshBuilder.CreatePlane(
    `slide-${slideState.id}`,
    {
      width: 1.6,
      height: 0.9,
      sideOrientation: Mesh.DOUBLESIDE,
    },
    targetScene,
  );

  // =====================================
  // Transform
  // =====================================

  const slideScale = normalizeSlideScale(slideState.slideScale);

  slideState.slideScale = slideScale;

  slideMesh.scaling.set(slideScale.x, slideScale.y, slideScale.z);

  slideMesh.position.copyFrom(slideState.position);

  slideMesh.rotationQuaternion = slideState.rotationQuaternion.clone();

  // =====================================
  // Material
  // =====================================

  const material = new StandardMaterial(
    `slide-material-${slideState.id}`,
    targetScene,
  );

  material.specularColor = new Color3(0, 0, 0);

  // =====================================
  // Assign
  // =====================================

  slideMesh.material = material;

  slideState.mesh = slideMesh;

  return {
    slideMesh,
    material,
  };
};

const applySlideTextureToMaterial = function (material, imageUrl, targetScene) {
  if (!material || !imageUrl || !targetScene) {
    return null;
  }

  // =====================================
  // Texture
  // =====================================

  const texture = new Texture(imageUrl, targetScene);

  texture.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
  texture.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;

  // PNG Alpha
  texture.hasAlpha = true;

  // =====================================
  // Material
  // =====================================

  material.diffuseTexture = texture;

  material.useAlphaFromDiffuseTexture = true;

  material.diffuseColor = Color3.White();

  material.specularColor = new Color3(0, 0, 0);

  material.alpha = 1;

  return texture;
};

const applySlideFallbackMaterial = function (material, type = "unassigned") {
  if (!material) {
    return;
  }

  // =====================================
  // TextureなしのFallback
  // =====================================

  material.diffuseTexture = null;
  material.useAlphaFromDiffuseTexture = false;

  material.specularColor = new Color3(0, 0, 0);
  material.alpha = 0.5;

  // =====================================
  // Fallback Color
  // =====================================

  if (type === "transparent") {
    // 意図的な透明スライド：編集時は青緑系で識別
    material.diffuseColor = new Color3(0.18, 0.48, 0.9);
  } else if (type === "missing") {
    // 画像指定あり・読み込み失敗
    material.diffuseColor = new Color3(0.7, 0.25, 0.25);
  } else {
    // 画像未設定
    material.diffuseColor = new Color3(1, 1, 1);
  }
};

const applySlideImageMaterialState = function (
  slideState,
  material,
  targetScene,
  { imagePath = null, imageUrl = null } = {},
) {
  if (!slideState || !material || !targetScene) {
    return false;
  }

  // =====================================
  // 画像未設定
  // =====================================

  if (!imagePath) {
    applySlideFallbackMaterial(material, slideState.transparentInPresentation ? "transparent" : "unassigned");

    slideState.imageUrl = null;
    slideState.activeImageUrl = null;

    return true;
  }

  // =====================================
  // 画像指定あり・URL取得失敗
  // =====================================

  if (!imageUrl) {
    applySlideFallbackMaterial(material, "missing");

    slideState.imageUrl = null;
    slideState.activeImageUrl = null;

    return false;
  }

  // =====================================
  // 正常な画像
  // =====================================

  applySlideTextureToMaterial(material, imageUrl, targetScene);

  slideState.imagePath = imagePath;
  slideState.imageUrl = imageUrl;
  slideState.activeImageUrl = imageUrl;

  return true;
};

const createSlideMeshes = async function (
  states,
  targetScene,
  directoryHandle,
  objectUrls,
) {
  for (const slideState of states) {
    // =========================
    // Plane / Material
    // =========================

    const { slideMesh, material } = createSlidePlaneAndMaterial(
      slideState,
      targetScene,
    );

    // =========================
    // Image
    // =========================

    let imagePath = normalizeSlideImagePath(slideState.imagePath);

    let imageUrl = null;

    if (imagePath) {
      imageUrl = await tryCreateProjectFileUrl(
        directoryHandle,
        imagePath,
        objectUrls,
      );
      // An image ID may have been reserved before its file was created.
      // When reopening, resolve all supported names by the normal priority.
      if (!imageUrl) {
        const imageId = extractImageIdFromSlideImagePath(imagePath);
        if (imageId !== null) {
          const found = await resolveSlideImagePathFromId(imageId, directoryHandle);
          if (found) {
            imageUrl = await tryCreateProjectFileUrl(directoryHandle, found, objectUrls);
            if (imageUrl) imagePath = found;
          }
        }
      }
    } else {
      console.warn("Slide imagePath is empty:", {
        id: slideState.id,
        slideState,
      });
    }

    // =====================================
    // Image Material State
    // =====================================

    if (!imagePath) {
      console.warn("Slide image unavailable:", {
        id: slideState.id,
      });
    } else if (!imageUrl) {
      console.warn("Slide image file not found:", {
        id: slideState.id,
        imagePath,
      });

      showAppNotice(`Slide ${slideState.id} の画像が見つかりません。`, {
        level: "warning",
      });
    }

    applySlideImageMaterialState(slideState, material, targetScene, {
      imagePath,
      imageUrl,
    });
  }

  return states;
};

const selectSlideByIndex = async function (index, { moveCamera = true, preserveSelection = false } = {}) {
  if (!Number.isInteger(index) || index < 0 || index >= slideStates.length) {
    return;
  }

  if (scenePreviewUi.previewName) {
    scenePreviewUi.previewName = null;
    scenePreviewUi.currentId = null;
    updateScenePreviewUi();
  }
  slideDrawing.clearSelection();
  drawingController.clearScreenSelection();
  currentSlideIndex = index;
  if (isEditorMode() && !preserveSelection) setSingleSlideSelection(index);
  ensureCurrentSlideSelected();

  if (moveCamera) {
    setCameraTransitionTarget();
  }

  await applyCurrentSlideEditorState();

  renderTable();

  renderSlideThumbnails();

  refreshSlideInspectorMode();
};

// Scene-2Q: Current indicates presentation/Scene context, not edit selection.
// Kept as a compatibility hook because older refresh/history paths invoke it.
// Never insert Current into Selection implicitly.
const ensureCurrentSlideSelected = function () {
  const validIds = new Set(slideStates.map(slide => slide.id));
  for (const id of selectedSlideIds) {
    if (!validIds.has(id)) selectedSlideIds.delete(id);
  }
};

const scene2qClearSelection = function () {
  selectedSlideIds.clear();
  slideSelectionAnchorIndex = null;
  canvasSelectedAssetIds.clear();
  scene2fClearAssetSelection();
  selectedSceneAssetId = null;
  renderSlideThumbnails();
  refreshSlideSelectionUi();
  refreshSceneAssetEditor();
  syncEditingSceneAssetGizmo();
  scene2cUpdateGroupStatus();
  refreshCanvasSelectionHighlights();
  if (typeof scene2uActivateGizmo === 'function') scene2uActivateGizmo('off');
  document.dispatchEvent(new Event("slidespace:selection-changed"));
};

const renderSlideThumbnails = function () {
  ensureCurrentSlideSelected();
  if (!thumbnailContainer) {
    return;
  }

  thumbnailContainer.innerHTML = "";

  if (!Array.isArray(slideStates) || slideStates.length === 0) {
    const empty = document.createElement("div");

    empty.textContent = "Slideがありません";

    empty.className = "slide-thumbnail-empty";

    thumbnailContainer.appendChild(empty);

    return;
  }

  slideStates.forEach((slideState, index) => {
    const item = createSlideThumbnailItem({
      slideState,
      index,
      isSelected: selectedSlideIds.has(slideState.id),
      isCurrent: index === currentSlideIndex,
    });

    if (index === currentSlideIndex) {
      requestAnimationFrame(scrollCurrentSlideThumbnailIntoView);
    }

    // =====================================
    // Click
    // =====================================

    bindSlideThumbnailClick({
      item,
      index,

      shouldIgnoreClick: () => {
        if (slideWasDragged) {
          slideWasDragged = false;
          return true;
        }

        return false;
      },

      onClick: async ({ index, selectionMode }) => {
        if (selectionMode === "current-only") {
          // Alt-click navigates to Current without replacing Selection.
          await selectSlideByIndex(index, {moveCamera:false,preserveSelection:true});
        } else if (selectionMode === "range") {
          // Shift selects a range while Current/Scene remain unchanged.
          selectSlideRange(index);
        } else if (selectionMode === "toggle") {
          // Ctrl/Cmd only toggles Selection, including the Current Slide.
          toggleSlideSelection(index);
        } else {
          setSingleSlideSelection(index);

          await selectSlideByIndex(index);
        }

        renderSlideThumbnails();
        refreshSlideSelectionUi();
      },
    });

    thumbnailContainer.appendChild(item);

    // =====================================
    // Drag
    // =====================================

    bindSlideThumbnailDrag({
      item,
      index,

      onDragStart: (event, index) => {
        closeSlideContextMenu();

        const targetEntries = prepareSlideSelectionForDrag(index);

        if (targetEntries.length === 0) {
          return false;
        }

        draggingSlideIndex = index;
        draggingSlideIds = targetEntries.map(({ slideState }) => slideState.id);

        slideWasDragged = true;

        slideOrderBeforeDrag = getSlideOrderIds();
        slideCurrentIdBeforeDrag = getCurrentSlideState()?.id ?? null;
        slideSelectionBeforeDrag = [...selectedSlideIds];

        const draggingIdSet = new Set(draggingSlideIds);

        document
          .querySelectorAll(".slide-thumbnail-item")
          .forEach((element) => {
            const elementIndex = Number(element.dataset.slideIndex);
            const elementSlide = slideStates[elementIndex];

            if (elementSlide && draggingIdSet.has(elementSlide.id)) {
              element.classList.add("dragging");
            }
          });

        return true;
      },

      onDragEnd: () => {
        draggingSlideIndex = null;
        draggingSlideIds = null;

        slideOrderBeforeDrag = null;
        slideCurrentIdBeforeDrag = null;
        slideSelectionBeforeDrag = null;

        setTimeout(() => {
          slideWasDragged = false;
        }, 0);
      },

      canDrop: () => {
        return draggingSlideIndex !== null && !!draggingSlideIds;
      },

      onDrop: async (insertionIndex) => {
        // The dragged thumbnail, rather than just its old index, determines
        // Current after reordering. Re-apply the editor scene and camera.
        const draggedSlideId = slideStates[index]?.id;
        const currentSlide = getCurrentSlideState();

        moveSlideIdsToInsertionIndex(draggingSlideIds, insertionIndex);

        if (currentSlide) {
          currentSlideIndex = slideStates.indexOf(currentSlide);
        }

        const afterOrder = getSlideOrderIds();

        if (
          slideOrderBeforeDrag &&
          slideOrderBeforeDrag.join(",") !== afterOrder.join(",")
        ) {
          recordSlideReorderHistory(
            slideOrderBeforeDrag,
            afterOrder,
            slideCurrentIdBeforeDrag,
            slideSelectionBeforeDrag,
          );
        }

        slideOrderBeforeDrag = null;
        slideCurrentIdBeforeDrag = null;
        slideSelectionBeforeDrag = null;

        draggingSlideIndex = null;
        draggingSlideIds = null;

        const targetIndex = slideStates.findIndex((slide) => slide.id === draggedSlideId);
        if (targetIndex >= 0) {
          selectedSlideIds.add(draggedSlideId);
          slideSelectionAnchorIndex = targetIndex;
          await selectSlideByIndex(targetIndex, { preserveSelection: true });
        }
        renderSlideThumbnails();
        renderTable();
        refreshSlideManagementUi();
        refreshSlideSelectionUi();
      },
    });

    // =====================================
    // 右クリックメニュー
    // =====================================

    bindSlideThumbnailContextMenu({
      item,
      index,

      onContextMenu: ({ index, clientX, clientY }) => {
        openSlideContextMenu(clientX, clientY, index);
      },
    });
  });
};

const getSlideOrderIds = function () {
  return slideStates.map((slideState) => slideState.id);
};

const recordSlideReorderHistory = function (
  beforeOrder,
  afterOrder,
  currentSlideId,
  selectedIds,
) {
  if (!Array.isArray(beforeOrder) || !Array.isArray(afterOrder)) {
    return false;
  }

  const same =
    beforeOrder.length === afterOrder.length &&
    beforeOrder.every((id, index) => id === afterOrder[index]);

  if (same) {
    return false;
  }

  pushEditorHistory({
    type: "slide-reorder",

    beforeOrder: [...beforeOrder],
    afterOrder: [...afterOrder],

    currentSlideId: currentSlideId ?? null,

    selectedSlideIds: Array.isArray(selectedIds) ? [...selectedIds] : [],
  });

  return true;
};

const applySlideOrderByIds = function (order) {
  if (!Array.isArray(order)) {
    return false;
  }

  // =====================================
  // 現在選択中Slideを保持
  // =====================================

  const currentSlide = getCurrentSlideState();

  // =====================================
  // ID -> slideState
  // =====================================

  const slideMap = new Map(
    slideStates.map((slideState) => [slideState.id, slideState]),
  );

  const reordered = [];

  for (const slideId of order) {
    const slideState = slideMap.get(slideId);

    if (slideState) {
      reordered.push(slideState);

      slideMap.delete(slideId);
    } else {
      console.warn("Slide order restore failed. Slide not found:", slideId);

      return false;
    }
  }

  // =====================================
  // Historyに存在しないSlideがあれば念のため
  // 末尾へ残す
  // =====================================

  for (const slideState of slideMap.values()) {
    reordered.push(slideState);
  }

  // =====================================
  // 数が一致することも確認
  // =====================================

  if (reordered.length !== slideStates.length) {
    console.warn("Slide order length mismatch");

    return false;
  }

  // =====================================
  // 配列を置換
  // =====================================

  slideStates.splice(0, slideStates.length, ...reordered);

  // =====================================
  // Current Slideを再検索
  // =====================================

  if (currentSlide) {
    currentSlideIndex = slideStates.indexOf(currentSlide);
  } else {
    currentSlideIndex = slideStates.length > 0 ? 0 : -1;
  }

  return true;
};

const cloneSlideTransformHistoryState = function (slideState) {
  return {
    position: slideState.position?.clone() ?? Vector3.Zero(),

    rotationQuaternion:
      slideState.rotationQuaternion?.clone() ?? Quaternion.Identity(),

    cameraPosition: slideState.cameraPosition?.clone() ?? Vector3.Zero(),

    cameraRotation: slideState.cameraRotation?.clone() ?? Quaternion.Identity(),
  };
};

const recordSlideTransformHistory = function (slideState, before, after) {
  if (!slideState || !before || !after) {
    return;
  }

  if (slideTransformHistoryStatesEqual(before, after)) {
    return;
  }

  pushEditorHistory({
    type: "slide-transform",

    slideId: slideState.id,

    before: cloneSlideTransformSnapshot(before),

    after: cloneSlideTransformSnapshot(after),
  });
};

const findSlideStateById = function (slideId) {
  return slideStates.find((slideState) => slideState.id === slideId) ?? null;
};

const applySlideTransformHistoryState = function (historyItem, state) {
  const slideState = findSlideStateById(historyItem.slideId);

  if (!slideState) {
    console.warn("Undo/Redo Slide not found:", historyItem.slideId);

    return false;
  }

  // =====================================
  // Slide State
  // =====================================

  slideState.position = state.position.clone();

  slideState.rotationQuaternion = state.rotationQuaternion.clone();

  slideState.slideScale = normalizeSlideScale(state.slideScale);

  slideState.cameraPosition = state.cameraPosition.clone();

  slideState.cameraRotation = state.cameraRotation.clone();

  // =====================================
  // Slide Mesh
  // =====================================

  if (slideState.mesh) {
    slideState.mesh.position.copyFrom(slideState.position);

    slideState.mesh.rotationQuaternion = slideState.rotationQuaternion.clone();

    slideState.mesh.rotation.set(0, 0, 0);

    slideState.mesh.computeWorldMatrix(true);
  }

  // =====================================
  // Current Slideなら実Cameraも戻す
  // =====================================

  if (getCurrentSlideState() === slideState) {
    applyCurrentSlideCameraPoseImmediately();

    refreshCurrentSlidePropertiesUi();

    refreshCurrentSlideGizmoAfterTransform();
  }

  return true;
};

const recordSlideImageHistory = function (
  slideState,
  beforeImagePath,
  afterImagePath,
) {
  if (!slideState) {
    return;
  }

  const before = normalizeSlideImagePath(beforeImagePath);

  const after = normalizeSlideImagePath(afterImagePath);


  if (before === after) {
    return;
  }

  pushEditorHistory({
    type: "slide-image",

    slideId: slideState.id,

    beforeImagePath: before,

    afterImagePath: after,
  });
};

const createSlideHistorySnapshot = function (slideState) {
  return {
    id: slideState.id,

    label: slideState.label ?? "",

    imagePath: normalizeSlideImagePath(slideState.imagePath),
    transparentInPresentation: slideState.transparentInPresentation === true,

    slideScale: normalizeSlideScale(slideState.slideScale),

    position: slideState.position?.clone() ?? Vector3.Zero(),

    rotationQuaternion:
      slideState.rotationQuaternion?.clone() ?? Quaternion.Identity(),

    cameraPosition: slideState.cameraPosition?.clone() ?? Vector3.Zero(),

    cameraRotation: slideState.cameraRotation?.clone() ?? Quaternion.Identity(),

    scenePreset: slideState.scenePreset ?? "default",

    environmentOverride: structuredClone(slideState.environmentOverride ?? {}),
    atmosphereOverrideEnabled: slideState.atmosphereOverrideEnabled === true,
    atmosphereOverride: slideState.atmosphereOverride ? normalizeAtmosphereEffects(slideState.atmosphereOverride) : undefined,

    transitionPreset: slideState.transitionPreset ?? "default",

    transitionOverride: structuredClone(slideState.transitionOverride ?? {}),
    transitionOverrideEnabled: slideState.transitionOverrideEnabled,
    transitionOverrideMode: slideState.transitionOverrideMode,

    soundPreset: slideState.soundPreset ?? "default",

    soundOverride: structuredClone(slideState.soundOverride ?? {}),
    soundOverrideEnabled: slideState.soundOverrideEnabled,
    soundOverrideMode: slideState.soundOverrideMode,

    bgmOverride: structuredClone(slideState.bgmOverride ?? {}),

    autoPlayOverride: normalizeSlideAutoPlayOverride(
      slideState.autoPlayOverride,
    ),

    interaction: normalizeSlideInteraction(slideState),
    action: normalizeSlideInteraction(slideState).type === "open-url" ? normalizeSlideInteraction(slideState).url : "",
  };
};

const restoreSlideMeshToScene = async function (slideState) {
  if (!scene || !slideState) {
    return false;
  }

  // =====================================
  // Async restore context
  // =====================================

  const targetScene = scene;
  const targetProject = currentProjectData;
  const targetDirectory = currentProjectDirectoryHandle;
  const targetUrlSet = activeProjectObjectUrls;
  const targetGlowLayer = activeGlowLayer;

  // =====================================
  // Plane / Material
  // =====================================

  const { slideMesh, material } = createSlidePlaneAndMaterial(
    slideState,
    scene,
  );

  // =====================================
  // Initial Fallback
  // =====================================

  applySlideFallbackMaterial(material, slideState.transparentInPresentation && !slideState.imagePath ? "transparent" : "unassigned");

  // SlideはGlow対象外
  if (activeGlowLayer) {
    registerSlideGlowOccluder(activeGlowLayer, slideMesh);
  }

  // =====================================
  // Image
  // =====================================

  const imagePath = normalizeSlideImagePath(slideState.imagePath);

  // =====================================
  // 画像未設定
  // =====================================

  if (!imagePath) {
    applySlideImageMaterialState(slideState, material, scene, {
      imagePath: null,
      imageUrl: null,
    });

    return true;
  }

  // =====================================
  // 画像指定あり
  // =====================================

  let pendingImageUrl = null;

  try {
    // =====================================
    // Image URL
    // =====================================

    const imageUrl = await createProjectFileUrl(
      targetDirectory,
      imagePath,
      targetUrlSet,
    );

    pendingImageUrl = imageUrl;

    registerPendingSlideImageUrl(imageUrl, targetUrlSet);

    // =====================================
    // Async validity check
    // =====================================

    const stillValid =
      scene === targetScene &&
      currentProjectData === targetProject &&
      currentProjectDirectoryHandle === targetDirectory &&
      activeProjectObjectUrls === targetUrlSet &&
      slideState.mesh === slideMesh &&
      !slideMesh.isDisposed();

    if (!stillValid) {
      // この復元処理によるURL保護を解除
      unregisterPendingSlideImageUrl(imageUrl, targetUrlSet);

      pendingImageUrl = null;

      releaseSlideImageUrlIfUnused(imageUrl, {
        urlSet: targetUrlSet,
      });

      // 旧Sceneのリソースを後始末
      if (slideState.mesh === slideMesh) {
        disposeSlideStateMesh(slideState, {
          glowLayer: targetGlowLayer,
        });
      } else if (!slideMesh.isDisposed()) {
        // slideState.meshが別Meshへ変更されていた場合、
        // 新しいMeshには触れず、古いMeshだけ破棄する。
        try {
          unregisterSlideGlowOccluder(targetGlowLayer, slideMesh);
        } catch {
          // ignore
        }

        slideMesh.dispose(false, true);
      }

      return false;
    }

    // =====================================
    // Apply image
    // =====================================

    applySlideImageMaterialState(slideState, material, targetScene, {
      imagePath,
      imageUrl,
    });
  } catch (error) {
    // =====================================
    // Async validity check
    // =====================================

    const stillValid =
      scene === targetScene &&
      currentProjectData === targetProject &&
      currentProjectDirectoryHandle === targetDirectory &&
      activeProjectObjectUrls === targetUrlSet &&
      slideState.mesh === slideMesh &&
      !slideMesh.isDisposed();

    // =====================================
    // Release pending URL
    // =====================================

    if (pendingImageUrl) {
      unregisterPendingSlideImageUrl(pendingImageUrl, targetUrlSet);

      releaseSlideImageUrlIfUnused(pendingImageUrl, {
        urlSet: targetUrlSet,
        excludeSlideState: slideState,
      });

      pendingImageUrl = null;
    }

    // =====================================
    // Project / Scene already changed
    // =====================================

    if (!stillValid) {
      console.debug("Slide image restore cancelled:", imagePath);

      if (slideState.mesh === slideMesh) {
        disposeSlideStateMesh(slideState, {
          glowLayer: targetGlowLayer,
        });
      } else if (!slideMesh.isDisposed()) {
        try {
          unregisterSlideGlowOccluder(targetGlowLayer, slideMesh);
        } catch {
          // ignore
        }

        slideMesh.dispose(false, true);
      }

      return false;
    }

    // =====================================
    // Genuine image loading error
    // =====================================

    console.warn("Slide image restore failed:", imagePath, error);

    applySlideFallbackMaterial(material, "missing");

    slideState.imageUrl = null;
    slideState.activeImageUrl = null;

    showAppNotice(`Slide image restore failed: "${imagePath}"`, {
      level: "warning",
      key: `restore-slide-image:${imagePath}`,
    });
  } finally {
    unregisterPendingSlideImageUrl(pendingImageUrl, targetUrlSet);
  }

  return true;
};

const recordSlidePresenceHistory = function ({
  slideState,
  index,
  beforeExists,
  afterExists,
  selectedSlideIdBefore = null,
  selectedSlideIdAfter = null,
  selectedSlideIdsBefore = null,
  selectedSlideIdsAfter = null,
}) {
  if (!slideState) {
    return;
  }

  pushEditorHistory({
    type: "slide-presence",

    slideId: slideState.id,

    slideSnapshot: createSlideHistorySnapshot(slideState),

    index: index,

    beforeExists: beforeExists,

    afterExists: afterExists,

    selectedSlideIdBefore: selectedSlideIdBefore,

    selectedSlideIdAfter: selectedSlideIdAfter,
    selectedSlideIdsBefore: selectedSlideIdsBefore ? [...selectedSlideIdsBefore] : null,
    selectedSlideIdsAfter: selectedSlideIdsAfter ? [...selectedSlideIdsAfter] : null,
  });
};

const getCurrentSlideId = function () {
  return getCurrentSlideState()?.id ?? null;
};

const applySlidePresenceState = async function (
  historyItem,
  shouldExist,
  selectedSlideId,
) {
  // 非同期処理開始時の所属先を固定
  const targetScene = scene;
  const targetProject = currentProjectData;
  const targetDirectory = currentProjectDirectoryHandle;
  const targetUrlSet = activeProjectObjectUrls;
  const targetGlowLayer = activeGlowLayer;
  const targetSlideStates = slideStates;

  const isContextValid = () =>
    scene === targetScene &&
    currentProjectData === targetProject &&
    currentProjectDirectoryHandle === targetDirectory &&
    activeProjectObjectUrls === targetUrlSet &&
    slideStates === targetSlideStates;

  const existingIndex = slideStates.findIndex(
    (slide) => slide.id === historyItem.slideId,
  );

  // =====================================
  // Slideを存在させる
  // =====================================

  if (shouldExist) {
    // すでにあるなら重複生成しない
    if (existingIndex < 0) {
      const restoredSlide = createSlideStateFromHistorySnapshot(
        historyItem.slideSnapshot,
      );

      const insertIndex = Math.max(
        0,
        Math.min(historyItem.index, slideStates.length),
      );

      slideStates.splice(insertIndex, 0, restoredSlide);

      const restored = await restoreSlideMeshToScene(restoredSlide);

      if (!restored || !isContextValid()) {
        // 古いプロジェクトの配列からだけ除去する。
        // 新しいプロジェクトのslideStatesには触れない。
        const rollbackIndex = targetSlideStates.indexOf(restoredSlide);

        if (rollbackIndex >= 0) {
          targetSlideStates.splice(rollbackIndex, 1);
        }

        const oldImageUrl = restoredSlide.activeImageUrl ?? null;

        disposeSlideStateMesh(restoredSlide, {
          glowLayer: targetGlowLayer,
        });

        releaseSlideImageUrlIfUnused(oldImageUrl, {
          urlSet: targetUrlSet,
        });

        restoredSlide.imageUrl = null;
        restoredSlide.activeImageUrl = null;

        return false;
      }
    }
  }

  // =====================================
  // Slideを存在させない
  // =====================================
  else {
    if (existingIndex >= 0) {
      const slideState = slideStates[existingIndex];

      if (getCurrentSlideState() === slideState) {
        detachSlideGizmo();
      }

      // =====================================
      // Dispose Slide / Release Image URL
      // =====================================

      const oldImageUrl = slideState.activeImageUrl ?? null;

      // Mesh / Material / Textureを破棄
      disposeSlideStateMesh(slideState);

      // Slide一覧から削除
      slideStates.splice(existingIndex, 1);

      // 他のSlideが使用していなければURLを解放
      releaseSlideImageUrlIfUnused(oldImageUrl);

      // Runtime上の画像参照をクリア
      slideState.imageUrl = null;
      slideState.activeImageUrl = null;
    }
  }

  slideCount = slideStates.length;

  // =====================================
  // Current Slide復元
  // =====================================

  if (selectedSlideId !== null && selectedSlideId !== undefined) {
    const selectedIndex = slideStates.findIndex(
      (slide) => slide.id === selectedSlideId,
    );

    if (selectedIndex >= 0) {
      currentSlideIndex = selectedIndex;
    } else {
      currentSlideIndex =
        slideStates.length > 0
          ? Math.min(historyItem.index, slideStates.length - 1)
          : -1;
    }
  } else {
    currentSlideIndex =
      slideStates.length > 0
        ? Math.min(historyItem.index, slideStates.length - 1)
        : -1;
  }

  const selectionIds = shouldExist ? historyItem.selectedSlideIdsAfter : historyItem.selectedSlideIdsBefore;
  if (Array.isArray(selectionIds)) {
    const validIds = new Set(slideStates.map(slide => slide.id));
    selectedSlideIds.clear();
    for (const id of selectionIds) if (validIds.has(id)) selectedSlideIds.add(id);
    ensureCurrentSlideSelected();
    slideSelectionAnchorIndex = currentSlideIndex;
  }
  await applyCurrentSlideEditorState();

  return true;
};

const initializeUsedSlideIds = function () {
  usedSlideIds.clear();

  for (const slideState of slideStates) {
    usedSlideIds.add(slideState.id);
  }
};

const setSingleSlideSelection = function (slideIndex) {
  selectedSlideIds.clear();

  const slideState = slideStates[slideIndex];

  if (!slideState) {
    slideSelectionAnchorIndex = null;

    return;
  }

  selectedSlideIds.add(slideState.id);

  slideSelectionAnchorIndex = slideIndex;
};

const toggleSlideSelection = function (slideIndex) {
  const slideState = slideStates[slideIndex];

  if (!slideState) {
    return;
  }

  // Scene-2Q: Current is independent, so toggling Current off is valid.
  if (selectedSlideIds.has(slideState.id)) selectedSlideIds.delete(slideState.id);
  else selectedSlideIds.add(slideState.id);
  slideSelectionAnchorIndex = slideIndex;
};

// Repeated Shift-click replaces the previous range using the same anchor;
// only an ordinary click or Ctrl-click changes the anchor.
const selectSlideRange = function (targetIndex) {
  if (slideStates.length === 0) {
    return;
  }

  const anchor = Number.isInteger(slideSelectionAnchorIndex)
    ? slideSelectionAnchorIndex
    : currentSlideIndex;

  if (!Number.isInteger(anchor) || anchor < 0) {
    setSingleSlideSelection(targetIndex);

    return;
  }

  const start = Math.min(anchor, targetIndex);

  const end = Math.max(anchor, targetIndex);

  selectedSlideIds.clear();

  for (let index = start; index <= end; index++) {
    const slideState = slideStates[index];

    if (slideState) {
      selectedSlideIds.add(slideState.id);
    }
  }
  ensureCurrentSlideSelected();
};

const areSelectedSlidesAtStart = function () {
  if (selectedSlideIds.size === 0) {
    return false;
  }

  const selectedCount = selectedSlideIds.size;

  for (let i = 0; i < selectedCount; i++) {
    if (!selectedSlideIds.has(slideStates[i]?.id)) {
      return false;
    }
  }

  return true;
};

const areSelectedSlidesAtEnd = function () {
  if (selectedSlideIds.size === 0) {
    return false;
  }

  const selectedCount = selectedSlideIds.size;

  const startIndex = slideStates.length - selectedCount;

  for (let i = startIndex; i < slideStates.length; i++) {
    if (!selectedSlideIds.has(slideStates[i]?.id)) {
      return false;
    }
  }

  return true;
};

const refreshInspectorContextUi = function () {
  const context = getSlideInspectorContext();
  const text = formatInspectorContext({ ...context, total: slideStates.length });
  const current = document.getElementById("slidePanelCurrentContext");
  const selection = document.getElementById("slidePanelSelectionContext");
  const summary = document.getElementById("slideSelectionSummary");
  if (current) current.textContent = text.current;
  if (selection) selection.textContent = text.selection;
  if (summary) summary.textContent = text.summary;
};

const refreshToolbarCurrentSlideStatus = function () {
  const slideState = getCurrentSlideState();

  if (!slideState) {
    toolbarCurrentSlideStatus.textContent = "Current: None";
    return;
  }

  const position = currentSlideIndex + 1;
  const total = slideStates.length;
  const label = String(slideState.label ?? "").trim();

  toolbarCurrentSlideStatus.textContent =
    `Current: ${position} / ${total}` + (label ? ` · ${label}` : "");
};

const refreshSlideSelectionUi = function () {
  ensureCurrentSlideSelected();
  refreshInspectorContextUi();
  const context = getSlideInspectorContext();

  const selectedCount = context.selectedCount;

  // 選択枚数表示
  slideSelectionStatus.textContent =
    selectedCount === 0
      ? "Selected: None"
      : `Selected: ${selectedCount} Slide${selectedCount === 1 ? "" : "s"}`;

  // Inspector更新
  refreshSlideInspectorMode();

  // 操作対象表示
  refreshSlideOperationTargetHint();

  // =====================================
  // Slide Gizmo Selection Sync
  // =====================================

  if (canAttachSlideGizmo()) {
    attachGizmoToCurrentSlide();
  } else {
    detachSlideGizmo();
  }

  // =====================================
  // Gizmo UI
  // =====================================

  refreshSlideGizmoUi();
  document.dispatchEvent(new Event("slidespace:selection-changed"));
};

const cleanupSlideSelection = function () {
  const validIds = new Set(slideStates.map((slide) => slide.id));

  for (const slideId of selectedSlideIds) {
    if (!validIds.has(slideId)) {
      selectedSlideIds.delete(slideId);
    }
  }

  ensureCurrentSlideSelected();
  refreshSlideSelectionUi();

  clearMultiInspectorDirtyFields();
};

const getSelectedSlideEntries = function () {
  ensureCurrentSlideSelected();
  return slideStates
    .map((slideState, index) => ({
      slideState,
      index,
    }))
    .filter(({ slideState }) => selectedSlideIds.has(slideState.id));
};

// ============================================================
// Slide Operation Targets
// ============================================================
//
// Slideの編集操作が対象とするSlideを解決する。
//
// Selectionあり:
//   Selected Slides
//
// Selectionなし:
//   Current Slide
//
// Current SlideはScene / Camera / Presentationの基準であり、
// Scene-1S以降、常にOperation TargetのSelectionにも含まれる。
// ============================================================

// Scene-2Q: Current is the Scene context, never an implicit edit target.
const getSlideOperationTargetEntries = function () {
  return getSelectedSlideEntries().filter(({slideState}) => !scene2oIsSlideHidden(slideState.id));
};

const getSlideOperationTargetSlides = function () {
  return getSlideOperationTargetEntries().map(({ slideState }) => slideState);
};

const prepareSlideSelectionForContextMenu = function (index) {
  const slideState = slideStates[index];

  if (!slideState) {
    return false;
  }

  // すでにSelectionに含まれているSlideなら、
  // Multi Selectionを維持する。
  if (selectedSlideIds.has(slideState.id)) {
    return true;
  }

  // Selection外のSlideを右クリックした場合は、
  // そのSlideだけを新しいSelectionにする。
  selectedSlideIds.clear();
  selectedSlideIds.add(slideState.id);

  currentSlideIndex = index;
  slideSelectionAnchorIndex = index;

  refreshSlideSelectionUi();
  refreshSlideSettingsInspector();
  refreshSlideManagementUi();

  return true;
};

const prepareSlideSelectionForDrag = function (index) {
  const slideState = slideStates[index];

  if (!slideState) {
    return [];
  }

  // Selected SlideからDrag開始:
  // 現在のMulti Selectionをそのまま使用する。
  if (selectedSlideIds.has(slideState.id)) {
    return getSlideOperationTargetEntries();
  }

  // Selection外からDrag開始:
  // そのSlideだけを新しいSelectionにする。
  selectedSlideIds.clear();
  selectedSlideIds.add(slideState.id);

  currentSlideIndex = index;
  slideSelectionAnchorIndex = index;

  refreshSlideSelectionUi();
  refreshSlideSettingsInspector();
  refreshSlideManagementUi();

  return getSlideOperationTargetEntries();
};

const moveSlideIdsToInsertionIndex = function (slideIds, insertionIndex) {
  const moveIdSet = new Set(slideIds);

  const movingSlides = slideStates.filter((slideState) =>
    moveIdSet.has(slideState.id),
  );

  if (movingSlides.length === 0) {
    return false;
  }

  // Drop位置より前に存在していた移動対象数。
  // 対象SlideをArrayから抜いた後のindex補正に使う。
  const removedBeforeInsertion = slideStates
    .slice(0, insertionIndex)
    .filter((slideState) => moveIdSet.has(slideState.id)).length;

  const remainingSlides = slideStates.filter(
    (slideState) => !moveIdSet.has(slideState.id),
  );

  let adjustedInsertionIndex = insertionIndex - removedBeforeInsertion;

  adjustedInsertionIndex = Math.max(
    0,
    Math.min(adjustedInsertionIndex, remainingSlides.length),
  );

  slideStates = [
    ...remainingSlides.slice(0, adjustedInsertionIndex),
    ...movingSlides,
    ...remainingSlides.slice(adjustedInsertionIndex),
  ];

  return true;
};

const deleteSlides = async function () {
  const entries = getSlideOperationTargetEntries();

  if (entries.length === 0) {
    return;
  }

  // =====================================
  // History Before
  // =====================================

  const selectionBefore = [...selectedSlideIds];

  const currentSlideIdBefore = getCurrentSlideState()?.id ?? null;
  const slideIdsBeforeDeletion = slideStates.map(({id}) => id);

  const historySlides = entries.map(({ slideState, index }) => ({
    index: index,

    snapshot: createSlideHistorySnapshot(slideState),
  }));

  // =====================================
  // Gizmo
  // =====================================

  detachSlideGizmo();

  // =====================================
  // Mesh / Material / Texture dispose
  // =====================================

  for (const { slideState } of entries) {
    disposeSlideStateMesh(slideState);
  }

  // =====================================
  // Unused Slide Image URLs
  // =====================================

  const deletedImageUrls = getActiveSlideImageUrls(
    entries.map(({ slideState }) => slideState),
  );

  for (const imageUrl of deletedImageUrls) {
    releaseSlideImageUrlIfUnused(imageUrl);
  }

  // 削除したSlideのRuntime参照を解除
  clearSlideRuntimeImageReferences(entries.map(({ slideState }) => slideState));

  // =====================================
  // Delete
  // =====================================

  const deleteIds = getSlideIds(entries.map(({ slideState }) => slideState));

  slideStates = removeSlidesByIds(slideStates, deleteIds);

  slideCount = slideStates.length;

  // =====================================
  // Selection After Delete
  // =====================================
  //
  // 削除対象だけをSelectionから除去する。
  // 削除後、新しいCurrentを必ずSelectionに含める。
  // =====================================

  for (const deleteId of deleteIds) {
    selectedSlideIds.delete(deleteId);
  }

  // =====================================
  // Current Slide After Delete
  // =====================================
  //
  // Currentが残っている場合:
  //   同じSlide IDをCurrentとして維持する。
  //
  // Currentが削除された場合:
  //   最初の削除位置付近の残存Slideを新Currentにする。
  // =====================================

  if (slideStates.length === 0) {
    currentSlideIndex = -1;
  } else {
    const preservedCurrentIndex =
      currentSlideIdBefore != null
        ? slideStates.findIndex(
            (slideState) => slideState.id === currentSlideIdBefore,
          )
        : -1;

    if (preservedCurrentIndex >= 0) {
      currentSlideIndex = preservedCurrentIndex;
    } else {
      // Prefer the closest surviving predecessor in the original order.
      // Fall forward only if there is no predecessor.
      const nextCurrentId = chooseCurrentAfterDeletion(
        slideIdsBeforeDeletion,
        deleteIds,
        currentSlideIdBefore,
      );
      const preferredIndex = slideStates.findIndex(slide => slide.id === nextCurrentId);
      currentSlideIndex = preferredIndex >= 0 ? preferredIndex : 0;
    }
  }

  slideSelectionAnchorIndex = currentSlideIndex;

  const currentAfter = getCurrentSlideState();

  // =====================================
  // History After
  // =====================================

  ensureCurrentSlideSelected();
  const selectionAfter = [...selectedSlideIds];

  const currentSlideIdAfter = currentAfter?.id ?? null;

  pushEditorHistory({
    type: "slide-presence-batch",

    operation: "delete",

    slides: historySlides,

    selectionBefore: selectionBefore,

    selectionAfter: selectionAfter,

    currentSlideIdBefore: currentSlideIdBefore,

    currentSlideIdAfter: currentSlideIdAfter,
  });

  await refreshAfterSlideReorderBatch();
};

const refreshAfterSlideReorderBatch = async function () {
  slideCount = slideStates.length;

  // =====================================
  // Current Index補正
  // =====================================

  if (slideStates.length === 0) {
    currentSlideIndex = -1;
  } else {
    currentSlideIndex = Math.max(
      0,
      Math.min(currentSlideIndex, slideStates.length - 1),
    );
  }

  // =====================================
  // Selection掃除
  // =====================================

  cleanupSlideSelection();

  slideSelectionAnchorIndex = currentSlideIndex;

  // =====================================
  // Current Slide適用
  // =====================================

  if (currentSlideIndex >= 0) {
    await applyCurrentSlideEditorState();
  }

  // =====================================
  // UI
  // =====================================

  renderSlideThumbnails();

  renderTable();

  refreshSlideSettingsInspector();

  refreshSlideManagementUi();

  refreshSlideSelectionUi();

  // =====================================
  // Gizmo
  // =====================================

  if (slideGizmoMode !== "off" && currentSlideIndex >= 0) {
    attachGizmoToCurrentSlide();
  }

  // =====================================
  // Current SlideをTimeline内へ表示
  // =====================================
  scrollCurrentSlideThumbnailIntoView?.();
};

const restoreSlideBatch = async function (historyItem) {
  const items = [...historyItem.slides].sort((a, b) => a.index - b.index);

  // =====================================
  // Restore context
  // =====================================

  const targetScene = scene;
  const targetProject = currentProjectData;
  const targetDirectory = currentProjectDirectoryHandle;
  const targetUrlSet = activeProjectObjectUrls;
  const targetGlowLayer = activeGlowLayer;
  const targetSlideStates = slideStates;

  // 今回復元したSlideだけを記録
  const restoredSlides = [];

  // =====================================
  // Rollback
  // =====================================

  const rollback = () => {
    const restoredSet = new Set(restoredSlides);

    // 復元開始時の配列だけを変更する。
    // プロジェクト切替後のslideStatesには触れない。
    for (let i = targetSlideStates.length - 1; i >= 0; i--) {
      if (restoredSet.has(targetSlideStates[i])) {
        targetSlideStates.splice(i, 1);
      }
    }

    // 今回生成したリソースを解放
    const imageUrls = new Set(
      restoredSlides
        .map((slideState) => slideState.activeImageUrl)
        .filter(Boolean),
    );

    for (const slideState of restoredSlides) {
      disposeSlideStateMesh(slideState, {
        glowLayer: targetGlowLayer,
      });
    }

    for (const imageUrl of imageUrls) {
      releaseSlideImageUrlIfUnused(imageUrl, {
        urlSet: targetUrlSet,
      });
    }

    for (const slideState of restoredSlides) {
      slideState.imageUrl = null;
      slideState.activeImageUrl = null;
    }
  };

  // =====================================
  // Restore
  // =====================================

  try {
    for (const item of items) {
      // Scene / Project切替を検出
      if (
        scene !== targetScene ||
        currentProjectData !== targetProject ||
        currentProjectDirectoryHandle !== targetDirectory ||
        activeProjectObjectUrls !== targetUrlSet ||
        slideStates !== targetSlideStates
      ) {
        rollback();
        return false;
      }

      const slideState = createSlideStateFromHistorySnapshot(item.snapshot);

      // 失敗したSlide自身も後始末の対象にする
      restoredSlides.push(slideState);

      // =====================================
      // Mesh生成
      // =====================================

      const restored = await restoreSlideMeshToScene(slideState);

      // await中のScene切替も確認
      const contextValid =
        scene === targetScene &&
        currentProjectData === targetProject &&
        currentProjectDirectoryHandle === targetDirectory &&
        activeProjectObjectUrls === targetUrlSet &&
        slideStates === targetSlideStates;

      if (!restored || !contextValid) {
        console.warn("Slide batch restore failed:", slideState.id);

        rollback();
        return false;
      }

      // =====================================
      // 元位置へ戻す
      // =====================================

      const insertIndex = Math.max(0, Math.min(item.index, slideStates.length));

      slideStates.splice(insertIndex, 0, slideState);
    }
  } catch (error) {
    console.error("Slide batch restore error:", error);

    rollback();
    return false;
  }

  return true;
};

const removeSlideBatch = function (historyItem) {
  // =====================================
  // Delete targets
  // =====================================

  const deleteIds = new Set(historyItem.slides.map((item) => item.snapshot.id));

  const deletedSlides = slideStates.filter((slideState) =>
    deleteIds.has(slideState.id),
  );

  // =====================================
  // Gizmo
  // =====================================

  detachSlideGizmo();

  // =====================================
  // Mesh / Material / Texture
  // =====================================

  for (const slideState of deletedSlides) {
    disposeSlideStateMesh(slideState);
  }

  // =====================================
  // Remove from slideStates
  // =====================================

  slideStates = removeSlidesByIds(slideStates, deleteIds);

  // =====================================
  // Unused Object URLs
  // =====================================

  const deletedImageUrls = getActiveSlideImageUrls(deletedSlides);

  for (const imageUrl of deletedImageUrls) {
    releaseSlideImageUrlIfUnused(imageUrl);
  }

  // =====================================
  // Clear runtime references
  // =====================================

  clearSlideRuntimeImageReferences(deletedSlides);

  return true;
};

const isSlideBatchInsertionOperation = function (operation) {
  return operation === "duplicate" || operation === "paste";
};

const undoSlidePresenceBatch = async function (historyItem) {
  let success = false;

  if (historyItem.operation === "delete") {
    // =====================================
    // 1. まず削除したSlideを復元
    // =====================================

    success = await restoreSlideBatch(historyItem);

    if (!success) {
      return false;
    }

    // =====================================
    // 2. 削除前のSelection / Currentを復元
    // =====================================

    restoreSlideSelectionFromHistory(historyItem, "before");

    // =====================================
    // 3. UI更新
    // =====================================

    await refreshAfterSlideReorderBatch();

    return true;
  }

  if (isSlideBatchInsertionOperation(historyItem.operation)) {
    success = removeSlideBatch(historyItem);

    if (!success) {
      return false;
    }

    restoreSlideSelectionFromHistory(historyItem, "before");

    await refreshAfterSlideReorderBatch();

    return true;
  }

  return false;
};

const redoSlidePresenceBatch = async function (historyItem) {
  let success = false;

  if (historyItem.operation === "delete") {
    // =====================================
    // 1. また削除
    // =====================================

    success = removeSlideBatch(historyItem);

    if (!success) {
      return false;
    }

    // =====================================
    // 2. Delete後のSelection / Current
    // =====================================

    restoreSlideSelectionFromHistory(historyItem, "after");

    await refreshAfterSlideReorderBatch();

    return true;
  }

  if (isSlideBatchInsertionOperation(historyItem.operation)) {
    success = await restoreSlideBatch(historyItem);

    if (!success) {
      return false;
    }

    restoreSlideSelectionFromHistory(historyItem, "after");

    await refreshAfterSlideReorderBatch();

    return true;
  }

  return false;
};

const duplicateSlides = async function () {
  const entries = getSlideOperationTargetEntries();

  if (entries.length === 0) {
    return;
  }

  // =====================================
  // History Before
  // =====================================

  const selectionBefore = [...selectedSlideIds];

  const currentSlideIdBefore = getCurrentSlideState()?.id ?? null;

  // =====================================
  // Insert position
  // =====================================

  const lastSelectedIndex = entries[entries.length - 1].index;

  let insertIndex = lastSelectedIndex + 1;

  const historySlides = [];

  const duplicatedIds = [];

  // =====================================
  // Duplicate
  // =====================================

  for (const { slideState: source } of entries) {
    const duplicate = createSlideDuplicateState(source, createUniqueSlideId);

    // Thumbnailは同じRuntime URLをそのまま共有
    duplicate.imageUrl = source.imageUrl ?? null;
    avoidSlidePositionOverlap(duplicate);

    const restored = await restoreSlideMeshToScene(duplicate);

    if (!restored) {
      console.warn("Slide duplicate restore failed:", duplicate.id);

      continue;
    }

    slideStates.splice(insertIndex, 0, duplicate);

    historySlides.push({
      index: insertIndex,

      snapshot: createSlideHistorySnapshot(duplicate),
    });

    duplicatedIds.push(duplicate.id);

    insertIndex++;
  }

  if (duplicatedIds.length === 0) {
    return;
  }

  // =====================================
  // Selection
  // =====================================

  selectedSlideIds.clear();

  for (const id of duplicatedIds) {
    selectedSlideIds.add(id);
  }

  const lastDuplicateId = duplicatedIds[duplicatedIds.length - 1];

  // Duplicates are selected, but Current remains the presentation/Scene context.
  const preservedCurrentId = preserveCurrentAfterInsertion(currentSlideIdBefore, slideStates);
  currentSlideIndex = slideStates.findIndex(slide => slide.id === preservedCurrentId);
  if (currentSlideIndex < 0 && slideStates.length) currentSlideIndex = 0;
  slideSelectionAnchorIndex = slideStates.findIndex(slide => slide.id === lastDuplicateId);

  // =====================================
  // History
  // =====================================

  pushEditorHistory({
    type: "slide-presence-batch",

    operation: "duplicate",

    slides: historySlides,

    selectionBefore: selectionBefore,

    selectionAfter: [...duplicatedIds],

    currentSlideIdBefore: currentSlideIdBefore,

    currentSlideIdAfter: preservedCurrentId,
  });

  await refreshAfterSlideReorderBatch();
};

const restoreSlideSelectionFromHistory = function (historyItem, phase) {
  const ids =
    phase === "before"
      ? historyItem.selectionBefore
      : historyItem.selectionAfter;

  const currentId =
    phase === "before"
      ? historyItem.currentSlideIdBefore
      : historyItem.currentSlideIdAfter;

  // =====================================
  // Selection
  // =====================================

  selectedSlideIds.clear();

  for (const id of ids ?? []) {
    const exists = slideStates.some((slideState) => slideState.id === id);

    if (exists) {
      selectedSlideIds.add(id);
    }
  }

  // =====================================
  // Current
  // =====================================

  if (currentId == null) {
    currentSlideIndex = slideStates.length > 0 ? 0 : -1;
  } else {
    const index = slideStates.findIndex(
      (slideState) => slideState.id === currentId,
    );

    if (index >= 0) {
      currentSlideIndex = index;
    }
  }

  ensureCurrentSlideSelected();
  slideSelectionAnchorIndex = currentSlideIndex;
};

const fillPresetSelect = function (
  selectElement,
  presetMap,
  currentValue = null,
) {
  if (!selectElement) {
    return;
  }

  selectElement.innerHTML = "";

  // Mixed
  if (currentValue === "__mixed__") {
    const mixedOption = document.createElement("option");

    mixedOption.value = "";

    mixedOption.textContent = "— Mixed —";

    mixedOption.disabled = true;

    mixedOption.selected = true;

    selectElement.appendChild(mixedOption);
  }

  const names = Object.keys(presetMap ?? {});

  for (const name of names) {
    const option = document.createElement("option");

    option.value = name;

    option.textContent = name;

    selectElement.appendChild(option);
  }

  if (
    currentValue &&
    currentValue !== "__mixed__" &&
    names.includes(currentValue)
  ) {
    selectElement.value = currentValue;
  }
};

const applyPresetToInspectorTargets = async function (
  propertyName,
  presetName,
) {
  if (!isValidSlidePresetProperty(propertyName)) {
    console.warn("Invalid preset property:", propertyName);

    return false;
  }

  if (!presetName) {
    return false;
  }

  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  // =====================================
  // 変更対象を記録
  // =====================================

  const changes = [];

  for (const { slideState } of entries) {
    const before = slideState[propertyName] ?? "default";

    const after = presetName;

    // 同じならHistoryへ入れない
    if (before === after) {
      continue;
    }

    changes.push({
      slideId: slideState.id,

      before,

      after,
    });

    // 実際に変更
    slideState[propertyName] = after;
  }

  // 全部すでに同じPresetだった
  if (changes.length === 0) {
    return false;
  }

  // =====================================
  // History
  // =====================================

  pushEditorHistory({
    type: "slide-preset-batch",

    propertyName: propertyName,

    presetName: presetName,

    changes: changes,
  });

  // =====================================
  // UI / Current Scene更新
  // =====================================

  await refreshAfterSlidePresetBatch(propertyName, changes);

  return true;
};

const refreshAfterSlidePresetBatch = async function (propertyName, changes) {
  const currentSlide = getCurrentSlideState();

  const currentWasChanged =
    currentSlide &&
    changes.some((change) => change.slideId === currentSlide.id);

  // =====================================
  // ScenePreset変更で、
  // Current Slideも対象なら
  // 実際の3D Sceneも更新
  // =====================================

  if (currentWasChanged && propertyName === "scenePreset") {
    await applyCurrentSlideEditorState();
  }

  // =====================================
  // Inspector等
  // =====================================

  renderTable();

  renderSlideThumbnails();

  refreshSlideSettingsInspector();

  refreshSlideManagementUi();

  refreshSlideSelectionUi();
};

const getInspectorTargetPresetCommonValue = function (propertyName) {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return null;
  }

  const values = entries.map(
    ({ slideState }) => slideState[propertyName] ?? "default",
  );

  const first = values[0];

  const allSame = values.every((value) => value === first);

  return allSame ? first : "__mixed__";
};

const restoreCurrentSlideIndexById = function (slideId) {
  if (slideId == null) {
    return;
  }

  const index = slideStates.findIndex(
    (slideState) => slideState.id === slideId,
  );

  if (index >= 0) {
    currentSlideIndex = index;
  }
};

const moveSlides = async function (direction) {
  if (selectedSlideIds.size === 0) {
    return false;
  }

  const entries = getSlideOperationTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const beforeOrder = getSlideOrderIds();
  const currentSlideId = getCurrentSlideState()?.id ?? null;

  const targetIds = new Set(entries.map(({ slideState }) => slideState.id));

  let changed = false;

  if (direction === "left") {
    changed = moveSlideTargetsOneStepLeft(slideStates, targetIds);
  } else if (direction === "right") {
    changed = moveSlideTargetsOneStepRight(slideStates, targetIds);
  } else {
    return false;
  }

  if (!changed) {
    return false;
  }

  const afterOrder = getSlideOrderIds();

  restoreCurrentSlideIndexById(currentSlideId);
  slideSelectionAnchorIndex = currentSlideIndex;

  pushEditorHistory({
    type: "slide-reorder",
    beforeOrder,
    afterOrder,
    currentSlideId,
    selectedSlideIds: [...selectedSlideIds],
  });

  await refreshAfterSlideReorderBatch();

  return true;
};

const canMoveSlideTargetsLeft = function () {
  const entries = getSlideOperationTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const targetIds = new Set(entries.map(({ slideState }) => slideState.id));

  for (let i = 1; i < slideStates.length; i++) {
    if (
      targetIds.has(slideStates[i].id) &&
      !targetIds.has(slideStates[i - 1].id)
    ) {
      return true;
    }
  }

  return false;
};

const canMoveSlideTargetsRight = function () {
  const entries = getSlideOperationTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const targetIds = new Set(entries.map(({ slideState }) => slideState.id));

  for (let i = 0; i < slideStates.length - 1; i++) {
    if (
      targetIds.has(slideStates[i].id) &&
      !targetIds.has(slideStates[i + 1].id)
    ) {
      return true;
    }
  }

  return false;
};

const pushSlideReorderHistory = function (beforeOrder, currentSlideId) {
  const afterOrder = getSlideOrderIds();

  // 前後が完全に同じなら
  // Historyを作らない
  if (
    beforeOrder.length === afterOrder.length &&
    beforeOrder.every((id, index) => id === afterOrder[index])
  ) {
    return false;
  }

  pushEditorHistory({
    type: "slide-reorder",

    beforeOrder: beforeOrder,

    afterOrder: afterOrder,

    currentSlideId: currentSlideId,

    selectedSlideIds: [...selectedSlideIds],
  });

  return true;
};

const finalizeSelectedSlideReorder = async function (
  beforeOrder,
  currentSlideId,
) {
  restoreCurrentSlideIndexById(currentSlideId);

  slideSelectionAnchorIndex = currentSlideIndex;

  const historyAdded = pushSlideReorderHistory(beforeOrder, currentSlideId);

  if (!historyAdded) {
    return false;
  }

  await refreshAfterSlideReorderBatch();

  return true;
};

const moveSelectedSlidesToStart = async function () {
  if (selectedSlideIds.size === 0) return false;

  const beforeOrder = getSlideOrderIds();
  const currentSlideId = getCurrentSlideState()?.id ?? null;
  slideStates = moveSelectedSlidesToBoundary(slideStates, selectedSlideIds, "start");
  return await finalizeSelectedSlideReorder(beforeOrder, currentSlideId);
};

const moveSelectedSlidesToEnd = async function () {
  if (selectedSlideIds.size === 0) return false;

  const beforeOrder = getSlideOrderIds();
  const currentSlideId = getCurrentSlideState()?.id ?? null;
  slideStates = moveSelectedSlidesToBoundary(slideStates, selectedSlideIds, "end");
  return await finalizeSelectedSlideReorder(beforeOrder, currentSlideId);
};

const getGatherSelectedReferenceIndex = function () {
  const currentSlide = getCurrentSlideState();

  // CurrentがSelectedなら
  // Currentを基準にする
  if (currentSlide && selectedSlideIds.has(currentSlide.id)) {
    return currentSlideIndex;
  }

  // CurrentがSelectedでなければ
  // 最初のSelectedを基準
  const firstSelectedIndex = slideStates.findIndex((slideState) =>
    selectedSlideIds.has(slideState.id),
  );

  return firstSelectedIndex;
};

const gatherSelectedSlides = async function () {
  if (selectedSlideIds.size < 2) {
    return false;
  }

  const referenceIndex = getGatherSelectedReferenceIndex();

  if (referenceIndex < 0) {
    return false;
  }

  const beforeOrder = getSlideOrderIds();

  const currentSlideId = getCurrentSlideState()?.id ?? null;

  slideStates = gatherSelectedSlidesAroundIndex(
    slideStates,
    selectedSlideIds,
    referenceIndex,
  );

  return await finalizeSelectedSlideReorder(beforeOrder, currentSlideId);
};

const areSelectedSlidesContiguous = function () {
  const indices = slideStates
    .map((slideState, index) =>
      selectedSlideIds.has(slideState.id) ? index : -1,
    )
    .filter((index) => index >= 0);

  if (indices.length < 2) {
    return true;
  }

  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) {
      return false;
    }
  }

  return true;
};

// ============================================================
// 6C. Shared Slide Inspector
// ============================================================
//
// Single:
//   Current Slide
//
// Multi:
//   Selected Slides
//
// Transform / Environment / Transition / Sound /
// BGM / AutoPlay などの共通Inspector処理。

const getSlideInspectorContext = function () {
  ensureCurrentSlideSelected();
  const currentSlide = getCurrentSlideState();

  const selectedEntries = getSelectedSlideEntries();

  const selectedCount = selectedEntries.length;

  const isMulti = selectedCount >= 2;

  // ============================================================
  // 6C. Shared Slide Inspector
  // ============================================================
  //
  // Single:
  //   Selected Slide (if one is selected)
  //   Otherwise Current Slide
  //
  // Multi:
  //   Selected Slides
  //
  // Transform / Environment / Transition / Sound /
  // BGM / AutoPlay などの共通Inspector処理。

  const targetEntries = selectedEntries;

  return {
    mode: isMulti ? "multi" : "single",

    isMulti,

    isSingle: !isMulti,

    currentSlide,

    currentSlideIndex,

    selectedEntries,

    selectedCount,

    targetEntries,

    targetSlides: targetEntries.map(({ slideState }) => slideState),
  };
};

const getSlideInspectorTargetLabel = function (
  context = getSlideInspectorContext(),
) {
  // =====================================
  // Multi Selection
  // =====================================

  if (context.isMulti) {
    return `${context.selectedCount} Selected Slides`;
  }

  // =====================================
  // Single Target
  // =====================================

  const targetEntry = context.targetEntries[0];

  if (!targetEntry) {
    return "";
  }

  const { slideState, index } = targetEntry;

  const label = slideState.label || `Slide ${index + 1}`;

  // =====================================
  // Selected Slide
  // =====================================

  if (context.selectedCount === 1) {
    return `Selected: ${label}`;
  }

  // =====================================
  // Current Slide
  // =====================================

  return `Current: ${label}`;
};

const getSlideGizmoTargetEntry = function () {
  const context = getSlideInspectorContext();

  // Scene-2Y: an explicitly focused selected Slide takes priority. It
  // never changes Current and never adds an object to Selection.
  const explicit = context.targetEntries.find(({slideState}) =>
    String(slideState.id) === String(scene2yActiveSlideId) && !scene2oIsSlideHidden(slideState.id));
  if (explicit) return explicit;
  // Backwards-compatible fallback when the user has not chosen a focus.
  const current = getCurrentSlideState();
  if (current && selectedSlideIds.has(current.id)) {
    return { slideState: current, index: currentSlideIndex };
  }
  return context.targetEntries[0] ?? null;
};

const refreshSharedTransformContextUi = function (
  context = getSlideInspectorContext(),
) {
  // =====================================
  // DOM safety
  // =====================================

  if (!multiTransformSection || !slideTransformTargetLabel) {
    console.warn("Shared Transform UI is not available.", {
      multiTransformSection,
      slideTransformTargetLabel,
    });

    return;
  }

  const hasTarget = context.targetEntries.length > 0;

  multiTransformSection.hidden = !hasTarget;

  if (!hasTarget) {
    slideTransformTargetLabel.textContent = "";

    return;
  }

  // 共通の編集対象表示
  slideTransformTargetLabel.textContent = getSlideInspectorTargetLabel(context);

  refreshSharedTransformControls();

  refreshSharedInspectorSectionExpandedState("transform");
};

const refreshSlideInspectorSelectionUi = function (
  context = getSlideInspectorContext(),
) {
  // Inspectorの編集対象
  refreshSlideInspectorTitle(context);

  // 選択枚数
  multiSlideInspectorSelectionCount.textContent = `${context.selectedCount} Slides Selected`;

  // 選択中Slideの一覧
  refreshMultiSelectedSlideList(context);

  // Current SlideとSelectionの関係
  refreshMultiCurrentSlideInfo(context);

  // 複数Slide操作ボタン
  refreshMultiSlideActionButtons();
};

const refreshMultiSlideInspector = function (
  context = getSlideInspectorContext(),
) {
  refreshSlideInspectorSelectionUi(context);

  refreshAllSharedInspectorSectionExpandedStates();
};

const refreshSlideInspectorMode = function () {
  const context = getSlideInspectorContext();

  // =====================================
  // Shared Transform
  // =====================================

  refreshSharedTransformContextUi(context);

  // =====================================
  // Shared Presets / Overrides
  // =====================================

  refreshSharedSlideSettingsContextUi(context);

  // =====================================
  // Current Slide-specific Settings
  // =====================================

  refreshSlideSettingsInspector();

  // =====================================
  // Selection / Multi-slide Actions
  // =====================================

  refreshMultiSlideInspector(context);
};

const refreshSharedPresetControls = function () {
  refreshPresetEditors();
  const sceneValue = getInspectorTargetPresetCommonValue("scenePreset");

  const transitionValue =
    getInspectorTargetPresetCommonValue("transitionPreset");

  const soundValue = getInspectorTargetPresetCommonValue("soundPreset");

  fillPresetSelect(
    multiScenePresetSelect,
    currentProjectData?.scenePresets,
    sceneValue,
  );

  fillPresetSelect(
    multiTransitionPresetSelect,
    currentProjectData?.transitionPresets,
    transitionValue,
  );

  fillPresetSelect(
    multiSoundPresetSelect,
    currentProjectData?.soundPresets,
    soundValue,
  );

  // refreshSlideBgmOverrideControls();
};

// The workspace editor's checkbox follows slide selection as well as tab changes.
const scheduleSlideEnvironmentSync = () => queueMicrotask(() => {
  if (document.querySelector('[data-workspace-panel="slides"]')?.hidden === false) syncSlideEnvironmentEditor();
});

const inspectorTargetsHaveEnvironmentOverrides = function () {
  return getSlideInspectorTargetEntries().some(
    ({ slideState }) =>
      Object.keys(slideState.environmentOverride ?? {}).length > 0,
  );
};

const refreshMultiSlideActionButtons = function () {
  const selectedCount = selectedSlideIds.size;

  const hasSelection = selectedCount > 0;

  const hasMultiple = selectedCount >= 2;

  // =====================================
  // Gather
  // =====================================

  multiGatherButton.disabled = !hasMultiple || areSelectedSlidesContiguous();

  // =====================================
  // Start / End
  // =====================================

  multiMoveToStartButton.disabled = !hasSelection || areSelectedSlidesAtStart();

  multiMoveToEndButton.disabled = !hasSelection || areSelectedSlidesAtEnd();

  // =====================================
  // Environment
  // =====================================

  multiClearEnvironmentOverridesButton.disabled =
    !inspectorTargetsHaveEnvironmentOverrides() &&
    !Object.keys(getCurrentSlideState()?.environmentOverride ?? {}).length;
};

const refreshSlideInspectorTitle = function (
  context = getSlideInspectorContext(),
) {
  refreshInspectorContextUi();
  if (context.isMulti) {
    slideInspectorTitle.textContent = `Selected Slides (${context.selectedCount})`;
    return;
  }

  const currentSlide = context.currentSlide;

  if (!currentSlide) {
    slideInspectorTitle.textContent = "No Current Slide";
    return;
  }

  const label = currentSlide.label || `Slide ${context.currentSlideIndex + 1}`;

  slideInspectorTitle.textContent = `Current Slide: ${label}`;
};

const refreshSlideOperationTargetHint = function () {
  const selectedCount = selectedSlideIds.size;

  if (selectedCount > 0) {
    const selectedEntries = getSelectedSlideEntries();

    if (selectedCount === 1 && selectedEntries.length === 1) {
      const { slideState, index } = selectedEntries[0];

      const label =
        String(slideState.label ?? "").trim() || `Slide ${index + 1}`;

      slideOperationTargetHint.textContent = `Operations → Selected: ${label}`;

      return;
    }

    slideOperationTargetHint.textContent = `Operations → ${selectedCount} Selected Slides`;

    return;
  }

  slideOperationTargetHint.textContent = "Operations → None (Current unchanged)";
};

const refreshMultiSelectedSlideList = function (
  context = getSlideInspectorContext(),
) {
  const entries = context.selectedEntries;

  const labels = entries.map(
    ({ slideState, index }) => slideState.label || `Slide ${index + 1}`,
  );

  const maxVisible = 8;

  if (labels.length <= maxVisible) {
    multiSelectedSlideList.textContent = labels.join(", ");

    return;
  }

  multiSelectedSlideList.textContent =
    labels.slice(0, maxVisible).join(", ") +
    `, +${labels.length - maxVisible} more`;
};

const refreshMultiCurrentSlideInfo = function (
  context = getSlideInspectorContext(),
) {
  const currentSlide = context.currentSlide;

  if (!currentSlide) {
    multiCurrentSlideInfo.textContent = "Current: none";

    return;
  }

  const selected = selectedSlideIds.has(currentSlide.id);

  multiCurrentSlideInfo.textContent =
    `Current: ${
      currentSlide.label || `Slide ${context.currentSlideIndex + 1}`
    }` + (selected ? ` · ${t("Selected")}` : ` · ${t("Not selected")}`);
};

const getSlideInspectorTargetEntries = function () {
  if (scenePreviewUi.hideSlideObjects && isEditorMode()) return [];
  return getSlideInspectorContext().targetEntries;
};

const getSlideInspectorTargetSlides = function () {
  return getSlideInspectorContext().targetSlides;
};

const getSelectedEnvironmentOverrideCommonValue = function (propertyName) {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return {
      state: "none",
      value: undefined,
    };
  }

  const values = entries.map(
    ({ slideState }) => slideState.environmentOverride?.[propertyName],
  );

  const first = values[0];

  const allSame = values.every((value) => areEditorValuesEqual(value, first));

  if (!allSame) {
    return {
      state: "mixed",
      value: undefined,
    };
  }

  if (first === undefined) {
    return {
      state: "unset",
      value: undefined,
    };
  }

  return {
    state: "same",
    value: structuredClone(first),
  };
};

const refreshMultiEnvironmentOverrideControls = function () {
  // if (state.state === "unset") {
  //   const resolved = getSelectedResolvedEnvironmentCommonValue(propertyName);

  //   if (resolved.state === "same") {
  //     setMultiFieldState(
  //       stateElement,
  //       "inherited",
  //       `Inherited · ${resolved.value}`,
  //     );
  //   } else {
  //     setMultiFieldState(stateElement, "inherited", "Inherited · Mixed");
  //   }

  //   return;
  // }

  // =====================================
  // Numeric values
  // =====================================

  refreshMultiEnvironmentNumberInput(multiTurbidityInput, "turbidity");

  refreshMultiEnvironmentNumberInput(multiInclinationInput, "inclination");

  refreshMultiEnvironmentNumberInput(multiAzimuthInput, "azimuth");

  refreshMultiEnvironmentNumberInput(multiFogDensityInput, "fogDensity");
  if (multiFogDensitySlider) {
    const fogState = getSelectedEnvironmentOverrideCommonValue("fogDensity");
    const fallback = Number(getResolvedEditorEnvironment()?.fogDensity ?? 0.002);
    const sliderValue = fogState.state === "same" ? Number(fogState.value) : fallback;
    if (Number.isFinite(sliderValue)) multiFogDensitySlider.value = String(Math.max(0, Math.min(0.05, sliderValue)));
    multiFogDensitySlider.disabled = getSlideInspectorTargetEntries().length === 0;
    multiFogDensitySlider.dataset.valueState = fogState.state;
  }

  // Step 12K-2L: keep the sky sliders in sync with the inspector.
  for (const [property, slider] of Object.entries(environmentSkySliders)) {
    const state = getSelectedEnvironmentOverrideCommonValue(property);
    const fallback = Number(getResolvedEditorEnvironment()?.[property]);
    const value = state.state === "same" ? Number(state.value) : fallback;
    if (Number.isFinite(value)) {
      slider.value = String(Math.max(Number(slider.min), Math.min(Number(slider.max), value)));
    }
    slider.disabled = getSlideInspectorTargetEntries().length === 0;
    slider.dataset.valueState = state.state;
  }

  // =====================================
  // Use Skybox
  // =====================================

  if (!isMultiInspectorFieldDirty("environment:useSkybox")) {
    const useSkyboxState =
      getSelectedEnvironmentOverrideCommonValue("useSkybox");

    if (useSkyboxState.state === "same") {
      multiUseSkyboxSelect.value = useSkyboxState.value ? "true" : "false";
    } else {
      multiUseSkyboxSelect.value = "";
    }
  }

  // =====================================
  // Fog Color
  // =====================================

  if (!isMultiInspectorFieldDirty("environment:fogColor")) {
    const fogColorState = getSelectedEnvironmentOverrideCommonValue("fogColor");

    refreshMultiFogColorControl(fogColorState);
  }

  // refresh

  refreshMultiEnvironmentFieldState(multiUseSkyboxState, "useSkybox");

  refreshMultiEnvironmentFieldState(multiTurbidityState, "turbidity");

  refreshMultiEnvironmentFieldState(multiInclinationState, "inclination");

  refreshMultiEnvironmentFieldState(multiAzimuthState, "azimuth");

  refreshMultiEnvironmentFieldState(multiFogDensityState, "fogDensity");

  refreshMultiEnvironmentFieldState(multiFogColorState, "fogColor");
};

const refreshMultiFogColorControl = function (state) {
  if (state.state === "same") {
    multiFogColorInput.value = colorArrayToHex(state.value);

    multiFogColorMixedLabel.hidden = true;

    return;
  }

  // color input自体は空にできないので
  // 見た目用の値だけ入れておく
  multiFogColorInput.value = "#ffffff";

  multiFogColorMixedLabel.hidden = false;

  multiFogColorMixedLabel.textContent =
    state.state === "mixed" ? "— Mixed —" : "Not overridden";

  // const displayValue = formatEnvironmentResolvedValue(
  //   propertyName,
  //   resolved.value,
  // );
};

const applyEnvironmentOverrideToInspectorTargets = async function (
  propertyName,
  value,
  options = {},
) {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];

  for (const { slideState } of entries) {
    const override = slideState.environmentOverride ?? {};

    const before = structuredClone(override[propertyName]);

    const after = structuredClone(value);

    if (areEditorValuesEqual(before, after)) {
      continue;
    }

    changes.push({
      slideId: slideState.id,

      before,

      after,
    });

    if (!slideState.environmentOverride) {
      slideState.environmentOverride = {};
    }

    slideState.environmentOverride[propertyName] = structuredClone(after);
  }

  if (options.dirtyFieldKey) {
    clearMultiInspectorFieldDirty(options.dirtyFieldKey);
  }

  if (changes.length === 0) {
    refreshMultiEnvironmentOverrideControls();

    return false;
  }

  pushEditorHistory({
    type: "slide-environment-override-batch",

    propertyName,

    changes,
  });

  await refreshAfterEnvironmentOverrideBatch(changes);

  return true;
};

const refreshAfterEnvironmentOverrideBatch = async function (changes) {
  const currentSlide = getCurrentSlideState();

  const currentWasChanged =
    currentSlide &&
    changes.some((change) => change.slideId === currentSlide.id);

  if (currentWasChanged) {
    await applyCurrentSlideEditorState();
  }

  renderTable();

  renderSlideThumbnails();

  refreshSlideSettingsInspector();

  refreshSlideManagementUi();

  refreshSlideSelectionUi();
};

const clearEnvironmentOverridesFromInspectorTargets = async function () {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];

  for (const { slideState } of entries) {
    const before = structuredClone(slideState.environmentOverride ?? {});

    if (Object.keys(before).length === 0) {
      continue;
    }

    changes.push({
      slideId: slideState.id,

      before,
    });

    slideState.environmentOverride = {};
  }

  if (changes.length === 0) {
    return false;
  }

  pushEditorHistory({
    type: "slide-environment-override-clear-batch",

    changes,
  });

  await refreshAfterEnvironmentOverrideBatch(changes);

  clearMultiInspectorDirtyFieldsByPrefix("environment:");

  return true;
};

const refreshMultiEnvironmentNumberInput = function (
  inputElement,
  propertyName,
) {
  const fieldKey = `environment:${propertyName}`;

  // =====================================
  // 未Applyの入力を守る
  // =====================================

  if (isMultiInspectorFieldDirty(fieldKey)) {
    return;
  }

  // =====================================
  // 通常refresh
  // =====================================

  const state = getSelectedEnvironmentOverrideCommonValue(propertyName);

  if (state.state === "same") {
    inputElement.value = String(state.value);

    inputElement.placeholder = "";
  } else {
    inputElement.value = "";

    inputElement.placeholder =
      state.state === "mixed" ? "— Mixed —" : "Not overridden";
  }

};

const applyNumericEnvironmentOverrideFromInput = async function (
  inputElement,
  propertyName,
  options = {},
) {
  const raw = inputElement.value.trim();

  if (!raw) {
    return false;
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    return false;
  }

  if (options.min != null && value < options.min) {
    return false;
  }

  if (options.max != null && value > options.max) {
    return false;
  }

  const success = await applyEnvironmentOverrideToInspectorTargets(
    propertyName,
    value,
    {
      dirtyFieldKey: `environment:${propertyName}`,
    },
  );

  return success;
};

const getSelectedTransitionOverrideCommonValue = function (propertyName) {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return {
      state: "none",
      value: undefined,
    };
  }

  const values = entries.map(
    ({ slideState }) => slideState.transitionOverride?.[propertyName],
  );

  const first = values[0];

  const allSame = values.every((value) => areEditorValuesEqual(value, first));

  if (!allSame) {
    return {
      state: "mixed",
      value: undefined,
    };
  }

  if (first === undefined) {
    return {
      state: "unset",
      value: undefined,
    };
  }

  return {
    state: "same",
    value: structuredClone(first),
  };
};

const refreshMultiTransitionNumberInput = function (
  inputElement,
  propertyName,
) {
  const fieldKey = `transition:${propertyName}`;

  if (isMultiInspectorFieldDirty(fieldKey)) {
    return;
  }

  const state = getSelectedTransitionOverrideCommonValue(propertyName);

  if (state.state === "same") {
    inputElement.value = String(state.value);

    inputElement.placeholder = "";

    return;
  }

  inputElement.value = "";

  inputElement.placeholder =
    state.state === "mixed" ? "— Mixed —" : "Not overridden";
};

const refreshMultiTransitionOverrideControls = function () {
  refreshMultiTransitionNumberInput(multiPreviousSpeedInput, "previousSpeed");

  refreshMultiTransitionNumberInput(multiCurrentSpeedInput, "currentSpeed");

  refreshMultiTransitionNumberInput(multiNextSpeedInput, "nextSpeed");

  for (const [property, slider] of Object.entries(transitionSpeedSliders)) {
    const state = getSelectedTransitionOverrideCommonValue(property);
    slider.disabled = getSlideInspectorTargetEntries().length === 0;
    // An untouched Mixed/Unset field does not impose a speed override.
    slider.dataset.valueState = state.state;
    const speed = state.state === "same" ? Number(state.value) : 1;
    if (Number.isFinite(speed) && speed >= 0) {
      slider.max = String(Math.max(10, Math.ceil(speed)));
      if (forceTransitionSliderSync || document.activeElement !== slider) slider.value = String(speed);
    }
  }

  multiClearTransitionOverridesButton.disabled =
    !inspectorTargetsHaveTransitionOverrides();

  // refresh

  refreshMultiTransitionFieldState(multiPreviousSpeedState, "previousSpeed");

  refreshMultiTransitionFieldState(multiCurrentSpeedState, "currentSpeed");

  refreshMultiTransitionFieldState(multiNextSpeedState, "nextSpeed");
  // Scene-1C: the checkbox controls whether slide-specific values apply.
  const entries = getSlideInspectorTargetEntries();
  const flags = entries.map(({slideState}) => slideState.transitionOverrideEnabled !== undefined
    ? slideState.transitionOverrideEnabled !== false
    : (Object.keys(slideState.transitionOverride ?? {}).length > 0 ||
       (slideState.transitionPreset ?? "default") !== "default"));
  slideTransitionUseOverride.indeterminate = flags.length > 0 && flags.some(Boolean) && flags.some(v => !v);
  slideTransitionUseOverride.checked = flags.length > 0 && flags.every(Boolean);
  slideTransitionUseOverride.disabled = flags.length === 0;
  const modes = entries.map(({slideState}) => slideState.transitionOverrideMode === "preset" || slideState.transitionOverrideMode === "custom"
    ? slideState.transitionOverrideMode : (Object.keys(slideState.transitionOverride ?? {}).length ? "custom" : "preset"));
  const commonMode = modes.length && modes.every(mode => mode === modes[0]) ? modes[0] : "";
  slideTransitionMode.value = commonMode;
  slideTransitionMode.disabled = !slideTransitionUseOverride.checked || !entries.length;
  slideTransitionPresetRow.hidden = commonMode === "custom";
  slideTransitionCustomDetails.hidden = commonMode === "preset";
  multiTransitionPresetSelect.disabled = !slideTransitionUseOverride.checked || commonMode !== "preset";

  const timingModes = entries.map(({slideState}) => resolveTransition(currentProjectData, slideState).mode === 'duration' ? 'duration' : 'speed');
  const timingMode = timingModes.length && timingModes.every(v => v === timingModes[0]) ? timingModes[0] : '';
  slideCustomTransitionTimingMode.value = timingMode;
  slideCustomTransitionTimingMode.disabled = !slideTransitionUseOverride.checked || commonMode !== 'custom';
  slideTransitionSpeedFields.hidden = timingMode === 'duration';
  slideTransitionDurationFields.hidden = timingMode !== 'duration';
  for (const [property,input] of Object.entries(transitionDurationInputs)) {
    const state = getSelectedTransitionOverrideCommonValue(property);
    input.value = state.state === 'same' ? String(state.value) : '';
    input.placeholder = state.state === 'mixed' ? '— Mixed —' : 'Not overridden';
    input.disabled = !slideTransitionUseOverride.checked || commonMode !== 'custom';
  }
  for (const control of [multiPreviousSpeedInput,multiCurrentSpeedInput,multiNextSpeedInput,multiPreviousSpeedSlider,multiCurrentSpeedSlider,multiNextSpeedSlider]) {
    if (control) control.disabled = !slideTransitionUseOverride.checked || commonMode !== "custom";
  }

};

const inspectorTargetsHaveTransitionOverrides = function () {
  return getSlideInspectorTargetEntries().some(({ slideState }) => {
    const override = slideState.transitionOverride ?? {};

    return Object.keys(override).length > 0;
  });
};

const applyTransitionOverrideToInspectorTargets = async function (
  propertyName,
  value,
  options = {},
) {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];

  for (const { slideState } of entries) {
    const override = slideState.transitionOverride ?? {};

    const before = structuredClone(override[propertyName]);

    const after = structuredClone(value);

    if (areEditorValuesEqual(before, after)) {
      continue;
    }

    changes.push({
      slideId: slideState.id,

      before,

      after,
    });

    if (!slideState.transitionOverride) {
      slideState.transitionOverride = {};
    }

    slideState.transitionOverride[propertyName] = structuredClone(after);
  }

  if (changes.length === 0) {
    if (options.dirtyFieldKey) {
      clearMultiInspectorFieldDirty(options.dirtyFieldKey);
    }

    refreshMultiTransitionOverrideControls();

    return false;
  }

  pushEditorHistory({
    type: "slide-transition-override-batch",

    propertyName,

    changes,
  });

  if (options.dirtyFieldKey) {
    clearMultiInspectorFieldDirty(options.dirtyFieldKey);
  }

  await refreshAfterTransitionOverrideBatch(changes);

  return true;
};

const applyNumericTransitionOverrideFromInput = async function (
  inputElement,
  propertyName,
  options = {},
) {
  const raw = inputElement.value.trim();

  if (!raw) {
    return false;
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    return false;
  }

  if (options.min != null && value < options.min) {
    return false;
  }

  if (options.max != null && value > options.max) {
    return false;
  }

  const success = await applyTransitionOverrideToInspectorTargets(
    propertyName,
    value,
    {
      dirtyFieldKey: `transition:${propertyName}`,
    },
  );

  return success;
};

const refreshAfterTransitionOverrideBatch = async function (changes) {
  renderTable();

  renderSlideThumbnails();

  // Undo/Redo must restore focused range controls as well as the data.
  forceTransitionSliderSync = true;
  try { refreshSlideSettingsInspector(); } finally { forceTransitionSliderSync = false; }

  refreshSlideManagementUi();

  refreshSlideSelectionUi();

  // refreshSlideInspectorMode();
};

const undoSlideTransitionOverrideBatch = async function (historyItem) {
  const propertyName = historyItem.propertyName;

  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    if (!slideState.transitionOverride) {
      slideState.transitionOverride = {};
    }

    if (change.before === undefined) {
      delete slideState.transitionOverride[propertyName];
    } else {
      slideState.transitionOverride[propertyName] = structuredClone(
        change.before,
      );
    }
  }

  return true;
};

const redoSlideTransitionOverrideBatch = async function (historyItem) {
  const propertyName = historyItem.propertyName;

  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    if (!slideState.transitionOverride) {
      slideState.transitionOverride = {};
    }

    slideState.transitionOverride[propertyName] = structuredClone(change.after);
  }

  return true;
};

const clearTransitionOverridesFromInspectorTargets = async function () {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];

  for (const { slideState } of entries) {
    const before = structuredClone(slideState.transitionOverride ?? {});

    if (Object.keys(before).length === 0) {
      continue;
    }

    changes.push({
      slideId: slideState.id,

      before,
    });

    slideState.transitionOverride = {};
  }

  if (changes.length === 0) {
    return false;
  }

  pushEditorHistory({
    type: "slide-transition-override-clear-batch",

    changes,
  });

  await refreshAfterTransitionOverrideBatch(changes);

  clearMultiInspectorDirtyFieldsByPrefix("transition:");

  return true;
};

const undoClearTransitionOverridesBatch = async function (historyItem) {
  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    slideState.transitionOverride = structuredClone(change.before);
  }

  return true;
};

const redoClearTransitionOverridesBatch = async function (historyItem) {
  for (const change of historyItem.changes) {
    const slideState = slideStates.find((slide) => slide.id === change.slideId);

    if (!slideState) {
      continue;
    }

    slideState.transitionOverride = {};
  }

  return true;
};

const clearMultiInspectorDirtyFields = function () {
  resetMultiInspectorPendingState();
};

const clearMultiInspectorDirtyFieldsByPrefix = function (prefix) {
  for (const key of [...dirtyMultiInspectorFields]) {
    if (key.startsWith(prefix)) {
      dirtyMultiInspectorFields.delete(key);
    }
  }

  refreshMultiPendingUi();
};

const getSelectedSoundOverrideCommonValue = function (propertyName) {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return {
      state: "none",
      value: undefined,
    };
  }

  const values = entries.map(
    ({ slideState }) => slideState.soundOverride?.[propertyName],
  );

  const first = values[0];

  const allSame = values.every((value) => areEditorValuesEqual(value, first));

  if (!allSame) {
    return {
      state: "mixed",
      value: undefined,
    };
  }

  if (first === undefined) {
    return {
      state: "unset",
      value: undefined,
    };
  }

  return {
    state: "same",
    value: structuredClone(first),
  };
};

const fillMultiSoundSelect = function (selectElement) {
  const previousValue = selectElement.value;

  selectElement.innerHTML = "";

  const unsetOption = document.createElement("option");

  unsetOption.value = MULTI_SOUND_UNSET_VALUE;

  unsetOption.textContent = "Not overridden";

  selectElement.appendChild(unsetOption);

  const names = getAvailableSoundAssetNames("sfx");

  for (const name of names) {
    const option = document.createElement("option");

    option.value = name;

    option.textContent = name;

    selectElement.appendChild(option);
  }

  if (
    [...selectElement.options].some((option) => option.value === previousValue)
  ) {
    selectElement.value = previousValue;
  }
};

const ensureMultiSoundMixedOption = function (selectElement) {
  let option = [...selectElement.options].find(
    (item) => item.value === MULTI_SOUND_MIXED_VALUE,
  );

  if (!option) {
    option = document.createElement("option");

    option.value = MULTI_SOUND_MIXED_VALUE;

    option.textContent = "— Mixed —";

    option.disabled = true;

    selectElement.insertBefore(option, selectElement.firstChild);
  }

  return option;
};

const refreshMultiSoundSelect = function (selectElement, propertyName) {
  const fieldKey = `sound:${propertyName}`;

  // =====================================
  // 未Apply値は保護
  // =====================================

  if (isMultiInspectorFieldDirty(fieldKey)) {
    return;
  }

  fillMultiSoundSelect(selectElement);

  const state = getSelectedSoundOverrideCommonValue(propertyName);

  if (state.state === "same") {
    const value = String(state.value);

    const exists = [...selectElement.options].some(
      (option) => option.value === value,
    );

    // もしProject変更などで
    // 現在値が一覧に無くても表示できるようにする
    if (!exists) {
      const option = document.createElement("option");

      option.value = value;

      option.textContent = value;

      selectElement.appendChild(option);
    }

    selectElement.value = value;

    return;
  }

  if (state.state === "mixed") {
    ensureMultiSoundMixedOption(selectElement);

    selectElement.value = MULTI_SOUND_MIXED_VALUE;

    return;
  }

  selectElement.value = MULTI_SOUND_UNSET_VALUE;
};

const refreshMultiSoundOverrideControls = function () {
  refreshMultiSoundSelect(multiPreviousSoundSelect, "previous");

  refreshMultiSoundSelect(multiCurrentSoundSelect, "current");

  refreshMultiSoundSelect(multiNextSoundSelect, "next");

  multiClearSoundOverridesButton.disabled =
    !inspectorTargetsHaveSoundOverrides();

  // refresh

  refreshMultiSoundFieldState(multiPreviousSoundState, "previous");

  refreshMultiSoundFieldState(multiCurrentSoundState, "current");

  refreshMultiSoundFieldState(multiNextSoundState, "next");
  // Scene-1C: the checkbox controls whether slide-specific values apply.
  const entries = getSlideInspectorTargetEntries();
  const flags = entries.map(({slideState}) => slideState.soundOverrideEnabled !== undefined
    ? slideState.soundOverrideEnabled !== false
    : (Object.keys(slideState.soundOverride ?? {}).length > 0 ||
       (slideState.soundPreset ?? "default") !== "default"));
  slideSoundUseOverride.indeterminate = flags.length > 0 && flags.some(Boolean) && flags.some(v => !v);
  slideSoundUseOverride.checked = flags.length > 0 && flags.every(Boolean);
  slideSoundUseOverride.disabled = flags.length === 0;
  const modes = entries.map(({slideState}) => slideState.soundOverrideMode === "preset" || slideState.soundOverrideMode === "custom"
    ? slideState.soundOverrideMode : (Object.keys(slideState.soundOverride ?? {}).length ? "custom" : "preset"));
  const commonMode = modes.length && modes.every(mode => mode === modes[0]) ? modes[0] : "";
  slideSoundMode.value = commonMode;
  slideSoundMode.disabled = !slideSoundUseOverride.checked || !entries.length;
  slideSoundPresetRow.hidden = commonMode === "custom";
  slideSoundCustomDetails.hidden = commonMode === "preset";
  multiSoundPresetSelect.disabled = !slideSoundUseOverride.checked || commonMode !== "preset";

  for (const control of [multiPreviousSoundSelect,multiCurrentSoundSelect,multiNextSoundSelect]) {
    if (control) control.disabled = !slideSoundUseOverride.checked || commonMode !== "custom";
  }

};

const inspectorTargetsHaveSoundOverrides = function () {
  return getSlideInspectorTargetEntries().some(({ slideState }) => {
    const override = slideState.soundOverride ?? {};

    return Object.keys(override).length > 0;
  });
};

const applySoundOverrideToInspectorTargets = async function (
  propertyName,
  value,
  options = {},
) {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];

  for (const { slideState } of entries) {
    const override = slideState.soundOverride ?? {};

    const before = structuredClone(override[propertyName]);

    const after = structuredClone(value);

    if (areEditorValuesEqual(before, after)) {
      continue;
    }

    changes.push({
      slideId: slideState.id,

      before,

      after,
    });

    if (!slideState.soundOverride) {
      slideState.soundOverride = {};
    }

    if (after === undefined) {
      delete slideState.soundOverride[propertyName];
    } else {
      slideState.soundOverride[propertyName] = structuredClone(after);
    }
  }

  // =====================================
  // Apply済みなのでdirty解除
  // =====================================

  if (options.dirtyFieldKey) {
    clearMultiInspectorFieldDirty(options.dirtyFieldKey);
  }

  if (changes.length === 0) {
    refreshMultiSoundOverrideControls();

    return false;
  }

  pushEditorHistory({
    type: "slide-sound-override-batch",

    propertyName,

    changes,
  });

  await refreshAfterSoundOverrideBatch(changes);

  return true;
};

const applySoundOverrideFromSelect = async function (
  selectElement,
  propertyName,
) {
  const raw = selectElement.value;

  if (raw === MULTI_SOUND_MIXED_VALUE) {
    return false;
  }

  const value = raw === MULTI_SOUND_UNSET_VALUE ? undefined : raw;

  return await applySoundOverrideToInspectorTargets(propertyName, value, {
    dirtyFieldKey: `sound:${propertyName}`,
  });
};

const refreshAfterSoundOverrideBatch = async function (changes) {
  renderTable();

  renderSlideThumbnails();

  refreshSlideSettingsInspector();

  refreshSlideManagementUi();

  refreshSlideSelectionUi();

  // refreshSlideInspectorMode();
};

const clearSoundOverridesFromInspectorTargets = async function () {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];

  for (const { slideState } of entries) {
    const before = structuredClone(slideState.soundOverride ?? {});

    if (Object.keys(before).length === 0) {
      continue;
    }

    changes.push({
      slideId: slideState.id,

      before,
    });

    slideState.soundOverride = {};
  }

  if (changes.length === 0) {
    clearMultiInspectorDirtyFieldsByPrefix("sound:");

    refreshMultiSoundOverrideControls();

    return false;
  }

  // Soundの未Apply値も破棄
  clearMultiInspectorDirtyFieldsByPrefix("sound:");

  pushEditorHistory({
    type: "slide-sound-override-clear-batch",

    changes,
  });

  await refreshAfterSoundOverrideBatch(changes);

  return true;
};

// Legacy bookkeeping remains for compatibility while the draft UI is removed.
const refreshMultiPendingUi = function () {
  refreshMultiSectionPendingUi();
};

const collectPendingMultiInspectorChanges = function (prefix = null) {
  const pending = [];

  for (const fieldKey of dirtyMultiInspectorFields) {
    if (prefix && !fieldKey.startsWith(prefix)) {
      continue;
    }

    // =====================================
    // Environment
    // =====================================

    if (fieldKey === "environment:turbidity") {
      const value = Number(multiTurbidityInput.value);

      if (Number.isFinite(value)) {
        pending.push({
          group: "environment",
          propertyName: "turbidity",
          value,
        });
      }

      continue;
    }

    if (fieldKey === "environment:inclination") {
      const value = Number(multiInclinationInput.value);

      if (Number.isFinite(value)) {
        pending.push({
          group: "environment",
          propertyName: "inclination",
          value,
        });
      }

      continue;
    }

    if (fieldKey === "environment:azimuth") {
      const value = Number(multiAzimuthInput.value);

      if (Number.isFinite(value)) {
        pending.push({
          group: "environment",
          propertyName: "azimuth",
          value,
        });
      }

      continue;
    }

    if (fieldKey === "environment:fogDensity") {
      const value = Number(multiFogDensityInput.value);

      if (Number.isFinite(value)) {
        pending.push({
          group: "environment",
          propertyName: "fogDensity",
          value,
        });
      }

      continue;
    }

    if (fieldKey === "environment:useSkybox") {
      const raw = multiUseSkyboxSelect.value;

      if (raw === "true" || raw === "false") {
        pending.push({
          group: "environment",
          propertyName: "useSkybox",
          value: raw === "true",
        });
      }

      continue;
    }

    if (fieldKey === "environment:fogColor") {
      const value = hexToColorArray(multiFogColorInput.value);

      if (value) {
        pending.push({
          group: "environment",
          propertyName: "fogColor",
          value,
        });
      }

      continue;
    }

    // =====================================
    // Transition
    // =====================================

    if (
      fieldKey === "transition:previousSpeed" ||
      fieldKey === "transition:currentSpeed" ||
      fieldKey === "transition:nextSpeed"
    ) {
      const propertyName = fieldKey.split(":")[1];

      const inputElement =
        propertyName === "previousSpeed"
          ? multiPreviousSpeedInput
          : propertyName === "currentSpeed"
            ? multiCurrentSpeedInput
            : multiNextSpeedInput;

      const value = Number(inputElement.value);

      if (Number.isFinite(value)) {
        pending.push({
          group: "transition",
          propertyName,
          value,
        });
      }

      continue;
    }

    // =====================================
    // Sound
    // =====================================

    if (
      fieldKey === "sound:previous" ||
      fieldKey === "sound:current" ||
      fieldKey === "sound:next"
    ) {
      const propertyName = fieldKey.split(":")[1];

      const selectElement =
        propertyName === "previous"
          ? multiPreviousSoundSelect
          : propertyName === "current"
            ? multiCurrentSoundSelect
            : multiNextSoundSelect;

      const raw = selectElement.value;

      if (raw === MULTI_SOUND_MIXED_VALUE) {
        continue;
      }

      const value = raw === MULTI_SOUND_UNSET_VALUE ? undefined : raw;

      pending.push({
        group: "sound",
        propertyName,
        value,
      });
    }
  }

  return pending;
};

const applyPendingMultiInspectorChanges = async function (prefix = null) {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const pending = collectPendingMultiInspectorChanges(prefix);

  if (pending.length === 0) {
    return false;
  }

  const changes = [];

  for (const { slideState } of entries) {
    for (const pendingChange of pending) {
      const { group, propertyName, value } = pendingChange;

      const override = getSlideOverrideObject(slideState, group);

      if (!override) {
        continue;
      }

      const before = structuredClone(override[propertyName]);

      const after = structuredClone(value);

      if (areEditorValuesEqual(before, after)) {
        continue;
      }

      changes.push({
        slideId: slideState.id,

        group,

        propertyName,

        before,

        after,
      });

      if (after === undefined) {
        delete override[propertyName];
      } else {
        override[propertyName] = structuredClone(after);
      }
    }
  }

  // =====================================
  // ApplyしたPendingだけ解除
  // =====================================

  if (prefix) {
    clearMultiInspectorDirtyFieldsByPrefix(prefix);
  } else {
    dirtyMultiInspectorFields.clear();

    refreshMultiPendingUi();
  }

  if (changes.length === 0) {
    reloadMultiInspectorDraftFromSlideStates();

    refreshMultiPendingUi();

    return false;
  }

  pushEditorHistory({
    type: "slide-multi-property-batch",

    changes,
  });

  await refreshAfterMultiPropertyBatch(changes);

  return true;
};

const applyEnvironmentPendingChanges = async function () {
  return await applyPendingMultiInspectorChanges("environment:");
};

const applyTransitionPendingChanges = async function () {
  return await applyPendingMultiInspectorChanges("transition:");
};

const discardEnvironmentPendingChanges = function () {
  if (getMultiInspectorPendingCountByPrefix("environment:") === 0) {
    return false;
  }

  clearMultiInspectorDirtyFieldsByPrefix("environment:");

  refreshMultiEnvironmentOverrideControls();

  refreshMultiPendingUi();

  return true;
};

const discardTransitionPendingChanges = function () {
  if (getMultiInspectorPendingCountByPrefix("transition:") === 0) {
    return false;
  }

  clearMultiInspectorDirtyFieldsByPrefix("transition:");

  refreshMultiTransitionOverrideControls();

  refreshMultiPendingUi();

  return true;
};

const applyAllPendingMultiInspectorChanges = async function () {
  return await applyPendingMultiInspectorChanges();
};

const refreshAfterMultiPropertyBatch = async function (changes) {
  const currentSlide = getCurrentSlideState();

  const currentEnvironmentChanged =
    currentSlide &&
    changes.some(
      (change) =>
        change.slideId === currentSlide.id && change.group === "environment",
    );

  // =====================================
  // Canvas
  // =====================================

  if (currentEnvironmentChanged) {
    await applyCurrentSlideEditorState();
  }

  // =====================================
  // UI
  // =====================================

  renderTable();

  renderSlideThumbnails();

  refreshSlideSettingsInspector();

  refreshSlideManagementUi();

  refreshSlideSelectionUi();

  refreshSlideInspectorMode();

  refreshMultiPendingUi();
};

const discardAllPendingMultiInspectorChanges = function () {
  if (dirtyMultiInspectorFields.size === 0) {
    return false;
  }

  // =====================================
  // 1. dirtyを全部解除
  // =====================================

  dirtyMultiInspectorFields.clear();

  // =====================================
  // 2. 確定済みslideStatesから
  //    各Editor UIを明示的に再読込
  // =====================================

  reloadMultiInspectorDraftFromSlideStates();

  // Preset等も含めて全体更新したければ
  refreshSharedPresetControls();

  refreshMultiSlideActionButtons();

  // =====================================
  // 3. Pending表示更新
  // =====================================

  refreshMultiPendingUi();

  return true;
};

const resetMultiInspectorPendingState = function () {
  dirtyMultiInspectorFields.clear();

  refreshMultiPendingUi();
};

const reloadMultiInspectorDraftFromSlideStates = function () {
  refreshMultiEnvironmentOverrideControls();

  refreshMultiTransitionOverrideControls();

  refreshMultiSoundOverrideControls();
};

const getMultiInspectorPendingCountByPrefix = function (prefix) {
  let count = 0;

  for (const fieldKey of dirtyMultiInspectorFields) {
    if (fieldKey.startsWith(prefix)) {
      count++;
    }
  }

  return count;
};

const refreshMultiSectionPendingUi = function () {
  multiEnvironmentSection?.classList.remove("has-pending");
  multiTransitionSection?.classList.remove("has-pending");
};

const refreshMultiEnvironmentFieldState = function (
  stateElement,
  propertyName,
) {
  const fieldKey = `environment:${propertyName}`;

  // =====================================
  // Pending最優先
  // =====================================

  if (isMultiInspectorFieldDirty(fieldKey)) {
    setMultiFieldState(stateElement, "pending");

    return;
  }

  const state = getSelectedEnvironmentOverrideCommonValue(propertyName);

  if (state.state === "mixed") {
    setMultiFieldState(stateElement, "mixed");

    return;
  }

  if (state.state === "same") {
    setMultiFieldState(stateElement, "override");

    return;
  }

  if (state.state === "unset") {
    const resolved = getSelectedResolvedEnvironmentCommonValue(propertyName);

    if (resolved.state === "same") {
      const displayValue = formatResolvedEnvironmentValue(
        propertyName,
        resolved.value,
      );

      setMultiFieldState(
        stateElement,
        "inherited",
        `Inherited · ${displayValue}`,
      );
    } else {
      setMultiFieldState(stateElement, "inherited", "Inherited · Mixed");
    }

    return;
  }

  setMultiFieldState(stateElement, null);
};

const refreshMultiTransitionFieldState = function (stateElement, propertyName) {
  const fieldKey = `transition:${propertyName}`;

  if (isMultiInspectorFieldDirty(fieldKey)) {
    setMultiFieldState(stateElement, "pending");

    return;
  }

  const state = getSelectedTransitionOverrideCommonValue(propertyName);

  if (state.state === "mixed") {
    setMultiFieldState(stateElement, "mixed");

    return;
  }

  if (state.state === "same") {
    setMultiFieldState(stateElement, "override");

    return;
  }

  if (state.state === "unset") {
    const resolved = getSelectedResolvedTransitionCommonValue(propertyName);

    if (resolved.state === "same") {
      const displayValue = formatResolvedTransitionValue(resolved.value);

      setMultiFieldState(
        stateElement,
        "inherited",
        `Inherited · ${displayValue}`,
      );
    } else {
      setMultiFieldState(stateElement, "inherited", "Inherited · Mixed");
    }

    return;
  }

  setMultiFieldState(stateElement, null);
};

const refreshMultiSoundFieldState = function (stateElement, propertyName) {
  const fieldKey = `sound:${propertyName}`;

  if (isMultiInspectorFieldDirty(fieldKey)) {
    setMultiFieldState(stateElement, "pending");

    return;
  }

  const state = getSelectedSoundOverrideCommonValue(propertyName);

  if (state.state === "mixed") {
    setMultiFieldState(stateElement, "mixed");

    return;
  }

  if (state.state === "same") {
    setMultiFieldState(stateElement, "override");

    return;
  }

  if (state.state === "unset") {
    const resolved = getSelectedResolvedSoundCommonValue(propertyName);

    if (resolved.state === "same") {
      const displayValue = formatResolvedSoundValue(resolved.value);

      setMultiFieldState(
        stateElement,
        "inherited",
        `Inherited · ${displayValue}`,
      );
    } else {
      setMultiFieldState(stateElement, "inherited", "Inherited · Mixed");
    }

    return;
  }

  setMultiFieldState(stateElement, null);
};

const getSelectedResolvedCommonValue = function (resolver, propertyName) {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return {
      state: "none",
      value: undefined,
    };
  }

  const values = entries.map(({ slideState }) => {
    const resolved = resolver(slideState);

    return resolved?.[propertyName];
  });

  const first = values[0];

  const allSame = values.every((value) => areEditorValuesEqual(value, first));

  if (!allSame) {
    return {
      state: "mixed",
      value: undefined,
    };
  }

  return {
    state: "same",
    value: structuredClone(first),
  };
};

const getSelectedResolvedEnvironmentCommonValue = function (propertyName) {
  return getSelectedResolvedCommonValue(
    (slideState) => resolveEnvironment(currentProjectData, slideState),
    propertyName,
  );
};

const getSelectedResolvedTransitionCommonValue = function (propertyName) {
  return getSelectedResolvedCommonValue(
    (slideState) => resolveTransition(currentProjectData, slideState),
    propertyName,
  );
};

const getSelectedResolvedSoundCommonValue = function (propertyName) {
  return getSelectedResolvedCommonValue(
    (slideState) => resolveSound(currentProjectData, slideState),
    propertyName,
  );
};

const refreshSharedInspectorSectionExpandedState = function (sectionName) {
  const ui = sharedInspectorSectionUi[sectionName];

  if (!ui) {
    return;
  }

  const expanded = sharedInspectorSectionExpanded[sectionName] !== false;

  ui.body.hidden = !expanded;

  ui.toggle.setAttribute("aria-expanded", String(expanded));

  ui.chevron.textContent = expanded ? "▾" : "▸";
};

const refreshAllSharedInspectorSectionExpandedStates = function () {
  refreshSharedInspectorSectionExpandedState("transform");

  refreshSharedInspectorSectionExpandedState("environment");

  refreshSharedInspectorSectionExpandedState("transition");

  refreshSharedInspectorSectionExpandedState("sound");
};

const toggleSharedInspectorSection = function (sectionName) {
  if (!Object.hasOwn(sharedInspectorSectionExpanded, sectionName)) {
    return;
  }

  sharedInspectorSectionExpanded[sectionName] =
    !sharedInspectorSectionExpanded[sectionName];

  refreshSharedInspectorSectionExpandedState(sectionName);
};

const setAllMultiInspectorSectionsExpanded = function (expanded) {
  for (const sectionName of Object.keys(sharedInspectorSectionExpanded)) {
    sharedInspectorSectionExpanded[sectionName] = expanded;
  }

  refreshAllSharedInspectorSectionExpandedStates();
};

const expandPendingMultiInspectorSections = function () {
  const definitions = [
    {
      name: "environment",
      prefix: "environment:",
    },
    {
      name: "transition",
      prefix: "transition:",
    },
    {
      name: "sound",
      prefix: "sound:",
    },
  ];

  for (const definition of definitions) {
    const count = getMultiInspectorPendingCountByPrefix(definition.prefix);

    if (count > 0) {
      sharedInspectorSectionExpanded[definition.name] = true;
    }
  }

  refreshAllSharedInspectorSectionExpandedStates();
};

const getInspectorTargetPositionCommonValue = function (axis) {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return {
      state: "none",
      value: undefined,
    };
  }

  const values = entries.map(({ slideState }) => slideState.position[axis]);

  const first = values[0];

  const allSame = values.every((value) => Math.abs(value - first) < 0.000001);

  return allSame
    ? {
        state: "same",
        value: first,
      }
    : {
        state: "mixed",
        value: undefined,
      };
};

const refreshMultiPositionInput = function (inputElement, axis) {
  const state = getInspectorTargetPositionCommonValue(axis);

  if (state.state === "same") {
    inputElement.value = String(Math.round(state.value * 10000) / 10000);

    inputElement.placeholder = "";
  } else {
    inputElement.value = "";

    inputElement.placeholder = "Mixed";
  }
};

const getInspectorTargetRotationCommonValue = function (axisName) {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return {
      state: "none",
      value: undefined,
    };
  }

  const values = entries.map(({ slideState }) => {
    const euler = getSlideRotationEulerDegrees(slideState);

    return euler[axisName];
  });

  const first = values[0];

  const allSame = values.every((value) => Math.abs(value - first) < 0.001);

  return allSame
    ? {
        state: "same",
        value: first,
      }
    : {
        state: "mixed",
        value: undefined,
      };
};

const refreshMultiRotationInput = function (inputElement, axisName) {
  const state = getInspectorTargetRotationCommonValue(axisName);

  if (state.state === "same") {
    inputElement.value = String(Math.round(state.value * 100) / 100);

    inputElement.placeholder = "";
  } else {
    inputElement.value = "";

    inputElement.placeholder = "Mixed";
  }
};

const refreshSharedTransformControls = function ({ forceRotationSliders = false, forceScaleSliders = false } = {}) {
  refreshMultiPositionInput(multiPositionXInput, "x");

  refreshMultiPositionInput(multiPositionYInput, "y");

  refreshMultiPositionInput(multiPositionZInput, "z");

  refreshMultiRotationInput(multiRotationPitchInput, "pitch");

  refreshMultiRotationInput(multiRotationYawInput, "yaw");

  refreshMultiRotationInput(multiRotationRollInput, "roll");
  for (const [axis, slider] of Object.entries(multiRotationSliders)) {
    if (!forceRotationSliders && document.activeElement === slider) continue;
    const state = getInspectorTargetRotationCommonValue(axis);
    slider.disabled = state.state === "none";
    slider.value = String(state.state === "same" ? Math.max(-180, Math.min(180, state.value)) : 0);
  }

  refreshSharedScaleInput(multiScaleXInput, "x");

  refreshSharedScaleInput(multiScaleYInput, "y");
  refreshSharedScaleInput(multiScaleZInput, "z");
  for (const [axis, slider] of Object.entries(slideScaleSliders)) {
    const state = getInspectorTargetSlideScaleCommonValue(axis);
    slider.disabled = state.state === "none";
    if (!forceScaleSliders && document.activeElement === slider) continue;
    const currentScale = getCurrentSlideState() ? normalizeSlideScale(getCurrentSlideState().slideScale)[axis] : 1;
    const value = state.state === "same" ? Number(state.value)
      : (scalePivotMode('slide') === 'group' ? currentScale : 1);
    slider.max = String(Math.max(5, Math.ceil(value)));
    slider.value = String(value);
  }

  refreshSlideScaleLinkButton();

  refreshMultiCameraControls();
};

const setSelectedSlidesPositionAxis = async function (axis, value) {
  if (!Number.isFinite(value)) {
    return false;
  }

  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];

  for (const { slideState } of entries) {
    const before = createSlideTransformHistorySnapshot(slideState);

    if (Math.abs(slideState.position[axis] - value) < 0.000001) {
      continue;
    }

    slideState.position[axis] = value;

    syncCameraPoseAfterSlideTransform(slideState, before);
    applySlideTransformStateToMesh(slideState);

    const after = createSlideTransformHistorySnapshot(slideState);

    changes.push({
      slideId: slideState.id,

      before,
      after,
    });
  }

  if (changes.length === 0) {
    return false;
  }

  pushEditorHistory({
    type: "slide-transform-batch",

    changes,
  });

  await refreshAfterSlideTransformBatch(changes, "after");

  return true;
};

const offsetSelectedSlidesPositionAxis = async function (axis, delta) {
  if (!Number.isFinite(delta)) {
    return false;
  }

  if (Math.abs(delta) < 0.000001) {
    return false;
  }

  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];

  for (const { slideState } of entries) {
    const before = createSlideTransformHistorySnapshot(slideState);

    slideState.position[axis] += delta;

    syncCameraPoseAfterSlideTransform(slideState, before);
    applySlideTransformStateToMesh(slideState);

    const after = createSlideTransformHistorySnapshot(slideState);

    changes.push({
      slideId: slideState.id,

      before,
      after,
    });
  }

  pushEditorHistory({
    type: "slide-transform-batch",

    changes,
  });

  await refreshAfterSlideTransformBatch(changes, "after");

  return true;
};

const createQuaternionFromEulerDegrees = function ({ pitch, yaw, roll }) {
  return Quaternion.RotationYawPitchRoll(
    degreesToRadians(yaw),

    degreesToRadians(pitch),

    degreesToRadians(roll),
  );
};

// The displayed angles are Euler coordinates. An absolute-field edit is
// interpreted as the requested angular change from the *displayed* coordinate,
// applied about the current World/Local gizmo axis. This deliberately does not
// claim that a post-rotation Euler component must equal the entered target.
const applyGizmoAxisTarget = (slideState, axisName, targetDegrees, displayedDegrees) => {
  const delta = targetDegrees - displayedDegrees;
  if (Math.abs(delta) < 0.000001) return false;
  const q = slideState.rotationQuaternion;
  slideState.rotationQuaternion = new Quaternion(...rotateAroundAxis(
    [q.x, q.y, q.z, q.w], axisName, delta, slideGizmoCoordinateMode,
  ));
  return true;
};

const setSelectedSlidesRotationAxis = async function (axisName, valueDegrees) {
  if (!Number.isFinite(valueDegrees)) {
    return false;
  }

  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];
  const pivotSlide = getCurrentSlideState();
  const pivot = scene2vSelectedSlideAnchor() ?? pivotSlide?.position?.clone();
  const baseQuaternion = pivotSlide?.rotationQuaternion?.clone();
  const currentEuler = pivotSlide ? getSlideRotationEulerDegrees(pivotSlide) : null;
  const sharedDelta = currentEuler ? valueDegrees - currentEuler[axisName] : 0;
  const sharedQ = baseQuaternion && Math.abs(sharedDelta) > 0.000001 ? (() => {
    const rotated = rotateAroundAxis([baseQuaternion.x,baseQuaternion.y,baseQuaternion.z,baseQuaternion.w],
      axisName, sharedDelta, slideGizmoCoordinateMode);
    return new Quaternion(...rotated).multiply(baseQuaternion.clone().conjugate()).normalize();
  })() : null;

  for (const { slideState } of entries) {
    const before = createSlideTransformHistorySnapshot(slideState);

    const euler = getSlideRotationEulerDegrees(slideState);

    if (rotationPivotMode('slide') === 'group') {
      if (!sharedQ || !pivot) continue;
      slideState.rotationQuaternion = sharedQ.multiply(before.rotationQuaternion).normalize();
      slideState.position = pivot.add(before.position.subtract(pivot).applyRotationQuaternion(sharedQ));
    } else {
      if (Math.abs(euler[axisName] - valueDegrees) < 0.000001) continue;
      applyGizmoAxisTarget(slideState, axisName, valueDegrees, euler[axisName]);
    }

    syncCameraPoseAfterSlideTransform(slideState, before);
    applySlideTransformStateToMesh(slideState);

    const after = createSlideTransformHistorySnapshot(slideState);

    changes.push({
      slideId: slideState.id,

      before,
      after,
    });
  }

  if (changes.length === 0) {
    return false;
  }

  pushEditorHistory({
    type: "slide-transform-batch",

    changes,
  });

  await refreshAfterSlideTransformBatch(changes, "after");

  return true;
};

const offsetSelectedSlidesRotationAxis = async function (
  axisName,
  deltaDegrees,
) {
  if (!Number.isFinite(deltaDegrees)) {
    return false;
  }

  if (Math.abs(deltaDegrees) < 0.000001) {
    return false;
  }

  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];
  const pivotSlide = getCurrentSlideState();
  const pivot = scene2vSelectedSlideAnchor() ?? pivotSlide?.position?.clone();
  const baseQuaternion = pivotSlide?.rotationQuaternion?.clone();
  const deltaQuaternion = baseQuaternion ? (() => {
    const rotated = rotateAroundAxis(
      [baseQuaternion.x,baseQuaternion.y,baseQuaternion.z,baseQuaternion.w],
      axisName,deltaDegrees,slideGizmoCoordinateMode);
    return new Quaternion(...rotated).multiply(baseQuaternion.clone().conjugate()).normalize();
  })() : null;

  for (const { slideState } of entries) {
    const before = createSlideTransformHistorySnapshot(slideState);

    // An offset is a rotation about a spatial axis, not an Euler-component edit.
    // Pre-multiply in World mode; post-multiply in Local mode, as in the gizmo.
    const q = slideState.rotationQuaternion;
    const rotated = rotateAroundAxis(
      [q.x, q.y, q.z, q.w], axisName, deltaDegrees, slideGizmoCoordinateMode,
    );
    slideState.rotationQuaternion = rotationPivotMode('slide') === 'group' && deltaQuaternion
      ? deltaQuaternion.multiply(before.rotationQuaternion).normalize()
      : new Quaternion(...rotated);
    if (rotationPivotMode('slide') === 'group' && deltaQuaternion && pivot) {
      slideState.position = pivot.add(before.position.subtract(pivot).applyRotationQuaternion(deltaQuaternion));
    }

    syncCameraPoseAfterSlideTransform(slideState, before);
    applySlideTransformStateToMesh(slideState);

    const after = createSlideTransformHistorySnapshot(slideState);

    changes.push({
      slideId: slideState.id,

      before,
      after,
    });
  }

  pushEditorHistory({
    type: "slide-transform-batch",

    changes,
  });

  await refreshAfterSlideTransformBatch(changes, "after");

  return true;
};

const refreshAfterSlideTransformBatch = async function () {
  renderTable();

  renderSlideThumbnails();

  refreshSlideSettingsInspector();

  refreshSlideManagementUi();

  refreshSlideSelectionUi();

  // Current SlideのGizmoだけ追従
  refreshCurrentSlideGizmoAfterTransform();
};

const getSlideCameraDistance = function (slideState) {
  if (!slideState?.position || !slideState?.cameraPosition) {
    return null;
  }

  return Vector3.Distance(slideState.position, slideState.cameraPosition);
};

// Scene-3P: camera controls follow the same Active Object / Selection scope
// as the unified Transform inspector; the focused Current is never implicit.
function scene3pCameraTargetEntries() {
  if (scenePreviewUi.hideSlideObjects && isEditorMode()) return [];
  if (scene3kScope === 'active') {
    const target = scene3cGetExplicitActive();
    return target?.kind === 'slide' && !scene2oIsSlideHidden(target.slideState.id)
      ? [{slideState:target.slideState}] : [];
  }
  return getSelectedSlideEntries().filter(({slideState})=>!scene2oIsSlideHidden(slideState.id));
}
function scene3pShouldFollowCamera(oldPosition, slideState) {
  const activeCamera = scene?.activeCamera ?? camera;
  if (!activeCamera?.position || !oldPosition || !slideState) return false;
  return shouldFollowSlideCameraView(
    activeCamera.position.asArray(), oldPosition.asArray(), getSlideCameraDistance(slideState),
  );
}
const getInspectorTargetCameraDistanceCommonValue = function () {
  const entries = scene3pCameraTargetEntries();

  if (entries.length === 0) {
    return {
      state: "none",
      value: undefined,
    };
  }

  const values = entries.map(({ slideState }) =>
    getSlideCameraDistance(slideState),
  );

  if (values.some((value) => !Number.isFinite(value))) {
    return {
      state: "mixed",
      value: undefined,
    };
  }

  const first = values[0];

  const allSame = values.every((value) => Math.abs(value - first) < 0.0001);

  return allSame
    ? {
        state: "same",
        value: first,
      }
    : {
        state: "mixed",
        value: undefined,
      };
};

const refreshMultiCameraControls = function () {
  const state = getInspectorTargetCameraDistanceCommonValue();

  if (state.state === "same") {
    // Present a consistent 0.1 grid for native number spinner interaction.
    // Internal slide camera positions retain their original full precision.
    const displayValue = Math.round(state.value * 10) / 10;

    multiCameraDistanceInput.value = String(displayValue);

    multiCameraDistanceInput.placeholder = "";
  } else {

    multiCameraDistanceInput.value = "";

    multiCameraDistanceInput.placeholder = "Mixed";
  }
  cameraDistanceSlider.disabled = state.state === "none";
  if (forceCameraDistanceSliderSync || document.activeElement !== cameraDistanceSlider) {
    const value = state.state === "same" ? Number(state.value) : 1;
    cameraDistanceSlider.max = String(Math.max(20, Math.ceil(value)));
    cameraDistanceSlider.value = String(value);
  }
};

const rebuildSlideCameraPoseWithDistance = function (slideState, distance) {
  if (!Number.isFinite(distance) || distance <= 0) {
    return false;
  }

  const forward = Vector3.Forward()
    .applyRotationQuaternion(slideState.rotationQuaternion)
    .normalize();

  slideState.cameraPosition = slideState.position.subtract(
    forward.scale(distance),
  );

  slideState.cameraRotation = slideState.rotationQuaternion.clone();

  return true;
};

const setCameraControllerPoseImmediately = function (position, rotation) {
  cameraCurrentPosition = position.clone();

  cameraCurrentRotation = rotation.clone();

  cameraEndPointPosition = position.clone();

  cameraEndPointRotation = rotation.clone();
};

const applyCameraPoseToViewport = function (cameraPosition, cameraRotation) {
  const activeCamera = scene?.activeCamera ?? camera;

  if (!activeCamera || !cameraPosition || !cameraRotation) {
    return false;
  }

  // Camera Controllerを同期
  setCameraControllerPoseImmediately(cameraPosition, cameraRotation);

  // Babylon Cameraへ即反映
  activeCamera.position.copyFrom(cameraCurrentPosition);

  if (activeCamera.rotationQuaternion) {
    activeCamera.rotationQuaternion.copyFrom(cameraCurrentRotation);
  } else {
    activeCamera.rotationQuaternion = cameraCurrentRotation.clone();
  }

  if (activeCamera.cameraDirection) {
    activeCamera.cameraDirection.setAll(0);
  }

  if (activeCamera.cameraRotation) {
    activeCamera.cameraRotation.setAll(0);
  }

  activeCamera.computeWorldMatrix(true);

  return true;
};

const applyCurrentSlideCameraPoseImmediately = function () {
  const slideState = getCurrentSlideState();

  if (!slideState) {
    return false;
  }

  return applyCameraPoseToViewport(
    slideState.cameraPosition,
    slideState.cameraRotation,
  );
};

const applySlideCameraBatchHistoryState = async function (
  historyItem,
  stateName,
) {
  let appliedCount = 0;

  for (const change of historyItem.changes) {
    const slideState = slideStates.find((item) => item.id === change.slideId);

    if (!slideState) {
      continue;
    }

    const state = change[stateName];

    if (!state) {
      continue;
    }

    slideState.cameraPosition = state.cameraPosition.clone();

    slideState.cameraRotation = state.cameraRotation.clone();

    appliedCount++;
  }

  if (appliedCount === 0) {
    return false;
  }

  await refreshAfterSlideCameraBatch(historyItem.changes, stateName);

  return true;
};

const setSelectedSlidesCameraDistance = async function (distance) {
  if (!Number.isFinite(distance) || distance <= 0) {
    return false;
  }

  const entries = scene3pCameraTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];

  for (const { slideState } of entries) {
    const before = createSlideCameraHistorySnapshot(slideState);

    const currentDistance = getSlideCameraDistance(slideState);

    if (
      Number.isFinite(currentDistance) &&
      Math.abs(currentDistance - distance) < 0.0001
    ) {
      continue;
    }

    const changed = rebuildSlideCameraPoseWithDistance(slideState, distance);

    if (!changed) {
      continue;
    }

    const after = createSlideCameraHistorySnapshot(slideState);

    changes.push({
      slideId: slideState.id,

      before,
      after,
    });
  }

  if (changes.length === 0) {
    return false;
  }

  pushEditorHistory({
    type: "slide-camera-batch",

    changes,
  });

  await refreshAfterSlideCameraBatch(changes, "after");

  return true;
};

const offsetSelectedSlidesCameraDistance = async function (delta) {
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.000001) {
    return false;
  }

  const entries = scene3pCameraTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];

  for (const { slideState } of entries) {
    const currentDistance = getSlideCameraDistance(slideState);

    if (!Number.isFinite(currentDistance)) {
      continue;
    }

    const nextDistance = currentDistance + delta;

    if (nextDistance <= 0) {
      continue;
    }

    const before = createSlideCameraHistorySnapshot(slideState);

    const changed = rebuildSlideCameraPoseWithDistance(
      slideState,
      nextDistance,
    );

    if (!changed) {
      continue;
    }

    const after = createSlideCameraHistorySnapshot(slideState);

    changes.push({
      slideId: slideState.id,

      before,
      after,
    });
  }

  if (changes.length === 0) {
    return false;
  }

  pushEditorHistory({
    type: "slide-camera-batch",

    changes,
  });

  await refreshAfterSlideCameraBatch(changes, "after");

  return true;
};

const refreshAfterSlideCameraBatch = async function (
  changes = null,
  historyStateName = "after",
) {
  renderTable();

  renderSlideThumbnails();

  forceCameraDistanceSliderSync = true;
  try { refreshSlideSettingsInspector(); } finally { forceCameraDistanceSliderSync = false; }

  refreshSlideManagementUi();

  refreshSlideSelectionUi();

  refreshSlideInspectorMode();

  const currentSlide = getCurrentSlideState();

  if (!currentSlide || !Array.isArray(changes)) {
    return;
  }

  const currentChange = changes.find(
    (change) => change.slideId === currentSlide.id,
  );

  if (!currentChange) {
    return;
  }

  const cameraState = currentChange[historyStateName];

  if (!cameraState) {
    return;
  }

  // Do not teleport the editor viewpoint when the user is inspecting
  // the slide from elsewhere. Undo checks the previous (after) snapshot.
  const previousName = historyStateName === 'after' ? 'before' : 'after';
  const previousPose = currentChange[previousName];
  if (previousPose && scene3pShouldFollowCamera(previousPose.cameraPosition, currentSlide)) {
    applyCameraPoseToViewport(cameraState.cameraPosition, cameraState.cameraRotation);
  }
};

const syncSharedSlideSettingsTarget = function (
  context = getSlideInspectorContext(),
) {
  const signature = getSlideInspectorTargetSignature(context);

  if (signature === sharedSlideSettingsTargetSignature) {
    return false;
  }

  // 編集対象が変わったので
  // 前の対象向けPendingは破棄
  dirtyMultiInspectorFields.clear();

  sharedSlideSettingsTargetSignature = signature;

  return true;
};

const refreshSharedSlideSettingsContextUi = function (
  context = getSlideInspectorContext(),
) {
  if (!sharedSlideSettings || !slideSettingsTargetLabel) {
    console.warn("Shared Slide Settings UI is not available.", {
      sharedSlideSettings,
      slideSettingsTargetLabel,
    });

    return;
  }

  const hasTarget = context.targetEntries.length > 0;

  sharedSlideSettings.hidden = !hasTarget;

  if (!hasTarget) {
    slideSettingsTargetLabel.textContent = "";

    return;
  }

  // =====================================
  // Target変更検出
  // =====================================

  syncSharedSlideSettingsTarget(context);

  // =====================================
  // Target表示
  // =====================================

  slideSettingsTargetLabel.textContent = getSlideInspectorTargetLabel(context);

  // =====================================
  // Presets
  // =====================================

  refreshSharedPresetControls();


  // =====================================
  // Overrides
  // =====================================

  refreshMultiEnvironmentOverrideControls();

  refreshMultiTransitionOverrideControls();

  refreshMultiSoundOverrideControls();

  // =====================================
  // Pending
  // =====================================

  refreshMultiPendingUi();

  refreshSharedInspectorSectionExpandedState("environment");

  refreshSharedInspectorSectionExpandedState("transition");

  refreshSharedInspectorSectionExpandedState("sound");
};

// Scale
const refreshSlideScaleLinkButton = function () {
  if (!multiScaleLinkButton) {
    return;
  }

  multiScaleLinkButton.classList.toggle("linked", slideScaleLinked);

  multiScaleLinkButton.setAttribute("aria-pressed", String(slideScaleLinked));

  multiScaleLinkButton.textContent = slideScaleLinked ? "🔗" : "⛓";
};

const refreshSharedScaleInput = function (inputElement, axis) {
  const state = getInspectorTargetSlideScaleCommonValue(axis);

  if (state.state === "same") {
    inputElement.value = String(Math.round(state.value * 10000) / 10000);

    inputElement.placeholder = "";
  } else {
    inputElement.value = "";

    inputElement.placeholder = "Mixed";
  }
};

// Scene-2I: one shared geometric rule for Gizmo and numeric group scaling.
// The camera follows the translated slide; changing scale alone does not move it.
const scene2iScaleSlideAroundPivot = (slideState, before, pivot, ratios) => {
  if (scalePivotMode('slide') !== 'group') return;
  const next = scalePositionAboutPivot(before.position.asArray(), pivot.asArray(), [ratios.x,ratios.y,ratios.z]);
  slideState.position = Vector3.FromArray(next);
  slideState.cameraPosition = Vector3.FromArray(followSlideTranslation(before.cameraPosition.asArray(), before.position.asArray(), next));
};
const scene2iCurrentScalePivot = () => scene2vSelectedSlideAnchor() ?? getCurrentSlideState()?.position?.clone() ?? null;
const scene2iCurrentScaleRatio = (axis, target, offset = false) => {
  const current = getCurrentSlideState();
  const base = current ? normalizeSlideScale(current.slideScale)[axis] : NaN;
  return Number.isFinite(base) && base > 0 ? (offset ? (base + target) / base : target / base) : 1;
};
const setInspectorSlidesScaleAxis = async function (axis, value) {
  if (!Number.isFinite(value) || value <= 0) {
    return false;
  }

  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];
  const groupMode = scalePivotMode('slide') === 'group' && entries.length > 1;
  const pivot = groupMode ? scene2iCurrentScalePivot() : null;
  const ratio = groupMode ? scene2iCurrentScaleRatio(axis, value) : 1;

  for (const { slideState } of entries) {
    const before = createSlideTransformHistorySnapshot(slideState);

    const scale = normalizeSlideScale(slideState.slideScale);

    if (groupMode) {
      for (const other of (slideScaleLinked ? ["x", "y", "z"] : [axis])) scale[other] *= ratio;
    } else if (slideScaleLinked) {
      const oldValue = scale[axis];

      if (oldValue <= 0) {
        continue;
      }

      if (Math.abs(oldValue - value) < 0.000001) {
        continue;
      }

      const factor = value / oldValue;

      for (const otherAxis of ["x", "y", "z"]) {
        if (otherAxis !== axis) scale[otherAxis] *= factor;
      }
      scale[axis] = value;
    } else {
      if (Math.abs(scale[axis] - value) < 0.000001) {
        continue;
      }

      scale[axis] = value;
    }

    // linked は次節

    // Keep inspector scaling aligned to its 0.01-step controls.
    scale.x = Math.max(0.01, Math.round(scale.x * 100) / 100);
    scale.y = Math.max(0.01, Math.round(scale.y * 100) / 100);
    scale.z = Math.max(0.01, Math.round(scale.z * 100) / 100);
    slideState.slideScale = scale;
    if (groupMode && pivot) scene2iScaleSlideAroundPivot(slideState, before, pivot, {x:slideScaleLinked?ratio:axis==="x"?ratio:1, y:slideScaleLinked?ratio:axis==="y"?ratio:1, z:slideScaleLinked?ratio:axis==="z"?ratio:1});

    applySlideTransformStateToMesh(slideState);

    const after = createSlideTransformHistorySnapshot(slideState);

    if (slideTransformHistoryStatesEqual(before,after)) continue;
    changes.push({
      slideId: slideState.id,

      before,

      after,
    });
  }

  if (changes.length === 0) {
    return false;
  }

  pushEditorHistory({
    type: "slide-transform-batch",

    changes,
  });

  await refreshAfterSlideTransformBatch();

  return true;
};

const offsetInspectorSlidesScaleAxis = async function (axis, delta) {
  if (!Number.isFinite(delta)) {
    return false;
  }

  if (Math.abs(delta) < 0.000001) {
    return false;
  }

  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];
  const groupMode = scalePivotMode('slide') === 'group' && entries.length > 1;
  const pivot = groupMode ? scene2iCurrentScalePivot() : null;
  const ratio = groupMode ? scene2iCurrentScaleRatio(axis, delta, true) : 1;
  if (groupMode && (!Number.isFinite(ratio) || ratio <= 0)) return false;

  for (const { slideState } of entries) {
    const before = createSlideTransformHistorySnapshot(slideState);

    const scale = normalizeSlideScale(slideState.slideScale);

    const oldValue = scale[axis];

    const newValue = oldValue + delta;

    if (!groupMode && (!Number.isFinite(newValue) || newValue <= 0)) {
      continue;
    }

    if (groupMode) {
      for (const other of (slideScaleLinked ? ["x", "y", "z"] : [axis])) scale[other] *= ratio;
    } else if (slideScaleLinked) {
      const factor = newValue / oldValue;
      for (const otherAxis of ["x", "y", "z"]) {
        if (otherAxis !== axis) scale[otherAxis] *= factor;
      }
      scale[axis] = newValue;
    } else {
      scale[axis] = newValue;
    }

    // Keep inspector scaling aligned to its 0.01-step controls.
    scale.x = Math.max(0.01, Math.round(scale.x * 100) / 100);
    scale.y = Math.max(0.01, Math.round(scale.y * 100) / 100);
    scale.z = Math.max(0.01, Math.round(scale.z * 100) / 100);
    slideState.slideScale = scale;
    if (groupMode && pivot) scene2iScaleSlideAroundPivot(slideState, before, pivot, {x:slideScaleLinked?ratio:axis==="x"?ratio:1, y:slideScaleLinked?ratio:axis==="y"?ratio:1, z:slideScaleLinked?ratio:axis==="z"?ratio:1});

    applySlideTransformStateToMesh(slideState);

    const after = createSlideTransformHistorySnapshot(slideState);

    if (slideTransformHistoryStatesEqual(before,after)) continue;
    changes.push({
      slideId: slideState.id,

      before,

      after,
    });
  }

  if (changes.length === 0) {
    return false;
  }

  pushEditorHistory({
    type: "slide-transform-batch",

    changes,
  });

  await refreshAfterSlideTransformBatch();

  return true;
};

const resetInspectorSlidesRotation = async function () {
  const entries = getSlideInspectorTargetEntries();
  const changes = [];
  for (const { slideState } of entries) {
    const q = slideState.rotationQuaternion;
    if (!q || Math.abs(q.x) + Math.abs(q.y) + Math.abs(q.z) < 1e-8 && Math.abs(Math.abs(q.w) - 1) < 1e-8) continue;
    const before = createSlideTransformHistorySnapshot(slideState);
    slideState.rotationQuaternion = Quaternion.Identity();
    syncCameraPoseAfterSlideTransform(slideState, before);
    applySlideTransformStateToMesh(slideState);
    const after = createSlideTransformHistorySnapshot(slideState);
    if (!slideTransformHistoryStatesEqual(before, after)) changes.push({ slideId: slideState.id, before, after });
  }
  if (!changes.length) return false;
  pushEditorHistory({ type: "slide-transform-batch", changes });
  await refreshAfterSlideTransformBatch(changes, "after");
  return true;
};

const resetInspectorSlidesScale = async function () {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];

  for (const { slideState } of entries) {
    const currentScale = normalizeSlideScale(slideState.slideScale);

    // =====================================
    // すでに Reset 状態なら Skip
    // =====================================

    if (
      Math.abs(currentScale.x - 1) < 0.000001 &&
      Math.abs(currentScale.y - 1) < 0.000001 &&
      Math.abs(currentScale.z - 1) < 0.000001
    ) {
      continue;
    }

    const before = createSlideTransformHistorySnapshot(slideState);

    slideState.slideScale = {
      x: 1,
      y: 1,
      z: 1,
    };

    applySlideTransformStateToMesh(slideState);

    const after = createSlideTransformHistorySnapshot(slideState);

    changes.push({
      slideId: slideState.id,

      before,

      after,
    });
  }

  if (changes.length === 0) {
    return false;
  }

  pushEditorHistory({
    type: "slide-transform-batch",

    changes,
  });

  await refreshAfterSlideTransformBatch();

  return true;
};

const getInspectorTargetSlideScaleCommonValue = function (axis) {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return {
      state: "none",
      value: undefined,
    };
  }

  const values = entries.map(
    ({ slideState }) => normalizeSlideScale(slideState.slideScale)[axis],
  );

  const first = values[0];

  const allSame = values.every((value) => Math.abs(value - first) < 0.000001);

  return allSame
    ? {
        state: "same",
        value: first,
      }
    : {
        state: "mixed",
        value: undefined,
      };
};

// Presentation
const isEditorMode = function () {
  return appMode === APP_MODE_EDITOR;
};

const isPresentationMode = function () {
  return appMode === APP_MODE_PRESENTATION;
};

const detachEditorGizmosForPresentation = function () {
  detachAssetGizmo();

  detachSlideGizmo();
};

const restoreEditorGizmosAfterPresentation = function () {
  // =====================================
  // Asset Gizmo
  // =====================================

  if (assetGizmoMode !== "off" && getSelectedSceneAssetConfig()) {
    attachGizmoToSelectedAsset();
  } else {
    detachAssetGizmo();
  }

  // =====================================
  // Slide Gizmo
  // =====================================

  if (slideGizmoMode !== "off" && getCurrentSlideState()?.mesh) {
    attachGizmoToCurrentSlide();
  } else {
    detachSlideGizmo();
  }
};

const restoreEditorAfterPresentation = async function () {
  // =====================================
  // Current Slide
  // =====================================

  await applyCurrentSlideEditorState();

  // =====================================
  // Inspector / Timeline
  // =====================================

  refreshSlideSelectionUi();

  refreshSlideManagementUi();

  renderSlideThumbnails();

  // =====================================
  // Gizmo / Canvas
  // =====================================

  requestAnimationFrame(() => {
    restoreEditorGizmosAfterPresentation();

    engine.resize();
  });
};

const refreshAppModeUi = function () {
  const presentation = isPresentationMode();

  editorApp?.classList.toggle("presentation-mode", presentation);
  for (const slideState of slideStates) {
    if (slideState.mesh && !slideState.mesh.isDisposed()) {
      if (presentation && slideState.transparentInPresentation) slideState.mesh.isVisible = false;
      // Restore editor-only visibility rules when leaving presentation.
      else if (!presentation && slideState.transparentInPresentation) slideState.mesh.isVisible = true;
    }
  }

  if (presentationOverlay) {
    presentationOverlay.hidden = !presentation;
  }

  if (presentButton) {
    presentButton.textContent = presentation
      ? "■ Exit Presentation"
      : "▶ Present";
  }

  // Layout変更後にBabylon Canvasを再計算
  // 二重 requestAnimationFrame() は必須ではないGrid→Blockのような大きなレイアウト変更では安定
  requestAnimationFrame(() => {
    engine.resize();

    requestAnimationFrame(() => {
      engine.resize();
    });
  });
};

const validatePresentationStart = function () {
  if (!Array.isArray(slideStates) || slideStates.length === 0) {
    return {
      ok: false,
      message: "Presentation に表示できる Slide がありません。",
    };
  }

  if (currentSlideIndex < 0 || currentSlideIndex >= slideStates.length) {
    currentSlideIndex = 0;
  }

  return {
    ok: true,
    message: "",
  };
};

// Drawing-3: presentation strokes stay in memory until the session ends.
// Keep applies a single history item; discard restores exact pre-session strokes.
const updatePresentationCameraButton = () => {
  if (!presentationCameraButton) return;
  presentationCameraButton.setAttribute("aria-pressed", String(isPresentationMode() && cameraControlViaMouse));
};
const stopPresentationCameraControl = () => {
  if (!cameraControlViaMouse) return;
  cameraNavigation?.stop();
  camera?.detachControl();
  cameraControlViaMouse = false;
  cameraControlStatus.textContent = t("開始");
  cameraControlButton.classList.remove("active");
  updatePresentationCameraButton();
};
presentationCameraButton?.addEventListener("click", () => {
  if (!isPresentationMode()) return;
  if (cameraControlViaMouse) {
    detachCameraControl();
  } else {
    // Camera-2 navigation and slide drawing must never own a drag together.
    if (drawingController.isActive()) detachDrawings();
    attachCameraControl();
  }
  updatePresentationDrawingButton();
  updatePresentationCameraButton();
});
const updatePresentationDrawingButton = () => {
  if (!presentationSlideDrawButton) return;
  const active = drawingController.isActive() && drawingTargetSelect?.value === "slide";
  presentationSlideDrawButton.setAttribute("aria-pressed", String(active));
  // The palette is contextual: only reveal it while slide drawing is enabled.
  document.querySelector(".presentation-brush-palette")?.classList.toggle("is-visible", active);
};
const finishPresentationDrawings = () => {
  if (!presentationDrawingSnapshot) return;
  if (drawingController.isActive()) detachDrawings();
  updatePresentationDrawingButton();
  const changes = [];
  for (const slide of slideStates) {
    const before = presentationDrawingSnapshot.get(slide.id) ?? [];
    const after = structuredClone(slide.drawings ?? []);
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    changes.push({ slideId: slide.id, before, after });
    if (!drawingKeepOnPresentationExit?.checked) {
      slide.drawings = structuredClone(before);
      slideDrawing.refreshSlide(slide);
    }
  }
  if (changes.length && drawingKeepOnPresentationExit?.checked) {
    pushEditorHistory({ type: "slide-drawing", changes });
    scheduleProjectStatusRefresh();
  }
  presentationDrawingSnapshot = null;
  presentationDrawingUndoStack.length = presentationDrawingRedoStack.length = 0;
  refreshPresentationDrawingHistoryUi();
};
// The presentation palette operates the same brush controls as the Editor.
function syncPresentationBrushPalette() {
  if (presentationBrushStyle) presentationBrushStyle.value = layerSwitch.checked ? "neon" : "standard";
  if (presentationBrushColor) presentationBrushColor.value = document.querySelector(".color-option.selected")?.dataset.color || "rgba(255, 0, 0, 1)";
  if (presentationBrushWidth) presentationBrushWidth.value = document.querySelector(".line-width-option.selected")?.dataset.width || "3";
  refreshPresentationPaletteVisuals();
}
// Drawing-5A: visualize the brush choices rather than requiring the viewer to
// decode a bare number or a translated colour name.
function refreshPresentationPaletteVisuals() {
  // Selection is a slot identity, not a color: identical colors may occupy different slots.
  const selectedSlot = Array.from(colorOptions).findIndex(el => el.classList.contains("selected"));
  document.querySelectorAll("#presentationQuickColors [data-palette-slot]").forEach(button => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.paletteSlot) === selectedSlot));
  });
  document.querySelectorAll("[data-presentation-style]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.presentationStyle === (layerSwitch.checked ? "neon" : "standard"))));
  if (presentationBrushColor) {
    const color = presentationBrushColor.value;
    presentationBrushColor.style.setProperty("--brush-color", color);
    presentationBrushColor.setAttribute("title", presentationBrushColor.selectedOptions[0]?.textContent ?? "");
  }
  if (presentationBrushWidth) {
    const width = Number(presentationBrushWidth.value) || 3;
    document.querySelectorAll("[data-brush-width]").forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.brushWidth) === width)));
    document.querySelector(".presentation-brush-width-preview")?.style.setProperty("--brush-preview-width", `${Math.max(2, Math.min(15, width))}px`);
  }
}
document.querySelectorAll("[data-presentation-style]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); if(!presentationBrushStyle) return; presentationBrushStyle.value=button.dataset.presentationStyle; presentationBrushStyle.dispatchEvent(new Event("change")); }));
presentationBrushStyle?.addEventListener("change", () => {
  layerSwitch.checked = presentationBrushStyle.value === "neon";
  drawingController.toggleActiveLayer();
  uiSound.play();
  refreshPresentationPaletteVisuals();
  document.querySelectorAll("[data-presentation-style]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.presentationStyle===presentationBrushStyle.value)));
});
presentationBrushColor?.addEventListener("change", () => {
  const option = Array.from(colorOptions).find(el => el.dataset.color === presentationBrushColor.value);
  option?.click();
  refreshPresentationPaletteVisuals();
});
document.querySelectorAll("[data-brush-width]").forEach((button, index) => {
  button.addEventListener("pointerdown", event => event.stopPropagation());
  button.addEventListener("click", event => {
    event.preventDefault(); event.stopPropagation();
    // Resolve a preset by its visual slot, not by floating text or stale select values.
    const editor = lineWidthOptions[index];
    if (editor) editor.click();
    syncPresentationBrushPalette();
  });
});
presentationBrushWidth?.addEventListener("change", () => {
  const option = Array.from(lineWidthOptions).find(el => el.dataset.width === presentationBrushWidth.value);
  option?.click();
  refreshPresentationPaletteVisuals();
});
layerSwitch?.addEventListener("change", syncPresentationBrushPalette);
colorOptions.forEach(el => el.addEventListener("click", syncPresentationBrushPalette));
lineWidthOptions.forEach(el => el.addEventListener("click", syncPresentationBrushPalette));
syncPresentationBrushPalette();
document.getElementById("presentationToolBrush")?.addEventListener("click", () => { setSlideDrawingTool("brush"); uiSound.play(); });
document.getElementById("presentationToolEraser")?.addEventListener("click", () => { setSlideDrawingTool("eraser"); uiSound.play(); });
function renderPresentationQuickColors() {
  const container = document.getElementById("presentationQuickColors");
  if (!container) return;
  container.replaceChildren(...paletteSwatches.map(swatch => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "presentation-color-swatch";
    button.style.backgroundColor = swatch.dataset.color;
    button.title = swatch.dataset.color;
    button.setAttribute("aria-label", swatch.dataset.color);
    const slotIndex = paletteSwatches.indexOf(swatch);
    button.dataset.paletteSlot = String(slotIndex);
    button.setAttribute("aria-pressed", String(swatch.classList.contains("selected")));
    for (const eventName of ["pointerdown", "pointerup"]) {
      button.addEventListener(eventName, event => event.stopPropagation());
    }
    button.addEventListener("click", event => {
      event.preventDefault(); event.stopPropagation();
      const editor = paletteSwatches[Number(event.currentTarget.dataset.paletteSlot)];
      if (!editor) return;
      editor.click();
      // The actual clicked slot is authoritative; do not resolve by color value.
      container.querySelectorAll("[data-palette-slot]").forEach(el => {
        el.setAttribute("aria-pressed", String(Number(el.dataset.paletteSlot) === slotIndex));
      });
      if (presentationBrushColor) presentationBrushColor.value = editor.dataset.color;
      refreshPresentationPaletteVisuals();
    });
    return button;
  }));
}

const WIDTH_PRESET_KEY = 'slidespace.drawing.widthPresets.v1';
function applyDrawingWidthPresets(values) {
  const defaults=[2,5,10];
  const parsed=values.map((value,i)=>Math.round(Number(value)||defaults[i]));
  parsed[0]=Math.max(1,Math.min(12,parsed[0]));
  parsed[1]=Math.max(parsed[0]+1,Math.min(24,parsed[1]));
  parsed[2]=Math.max(parsed[1]+1,Math.min(48,parsed[2]));
  const editorOptions=Array.from(lineWidthOptions);
  const presentationOptions=Array.from(document.querySelectorAll('[data-brush-width]'));
  const oldSelected=editorOptions.findIndex(el=>el.classList.contains('selected'));
  editorOptions.forEach((el,i)=>{el.dataset.width=String(parsed[i]);el.title=String(parsed[i]);});
  presentationOptions.forEach((el,i)=>{el.dataset.brushWidth=String(parsed[i]);el.title=String(parsed[i]);el.setAttribute('aria-label',String(parsed[i]));const line=el.querySelector('.quick-width-line');if(line)line.style.height=Math.max(2,Math.min(24,parsed[i]))+'px';});
  document.querySelectorAll('#presentationBrushWidth option').forEach((el,i)=>{el.value=String(parsed[i]);});
  document.querySelectorAll('[id^="drawingWidthPreset"]').forEach((el,i)=>{el.value=String(parsed[i]);});
  // Re-apply the selected width to keep the brush controller synchronized.
  editorOptions[Math.max(0,oldSelected)]?.click();
  refreshPresentationPaletteVisuals();
  try{localStorage.setItem(WIDTH_PRESET_KEY,JSON.stringify(parsed));}catch{}
}
const widthPresetInputs=[0,1,2].map(i=>document.getElementById('drawingWidthPreset'+i));
document.getElementById('drawingWidthPresetReset')?.addEventListener('click', () => {applyDrawingWidthPresets([2,5,10]);void uiSound.play();});
widthPresetInputs.forEach(el=>el?.addEventListener('change',()=>{applyDrawingWidthPresets(widthPresetInputs.map(input=>input?.value));void uiSound.play();}));
try{const raw=JSON.parse(localStorage.getItem(WIDTH_PRESET_KEY)||'null');applyDrawingWidthPresets(Array.isArray(raw)&&raw.length===3?raw:[2,5,10]);}catch{applyDrawingWidthPresets([2,5,10]);}

const neonGlowValue = document.getElementById('slideNeonGlowStrengthValue');
const syncNeonGlowLabel = () => { if (neonGlowValue) neonGlowValue.textContent = slideNeonGlowStrength.value; };
slideNeonGlowStrength?.addEventListener('input', syncNeonGlowLabel);
syncNeonGlowLabel();
document.getElementById('drawingNeonReset')?.addEventListener('click', () => {
  slideNeonGlowStrength.value = '1';
  fadeTimeInput.value = '3';
  syncNeonGlowLabel();
  slideNeonGlowStrength.dispatchEvent(new Event('input', {bubbles:true}));
  fadeTimeInput.dispatchEvent(new Event('change', {bubbles:true}));
  void uiSound.play();
});
renderPresentationQuickColors();
colorOptions.forEach(el => el.addEventListener("click", renderPresentationQuickColors));
// Keep palette swatches in sync when Editor changes their underlying colors.
// The existing updateDrawingPalette is invoked before this listener is wired;
// subsequent edits explicitly refresh the quick palette.
document.getElementById("drawingPaletteApply")?.addEventListener("click", renderPresentationQuickColors);
document.getElementById("drawingPaletteReset")?.addEventListener("click", renderPresentationQuickColors);
presentationSlideDrawButton?.addEventListener("click", () => {
  if (!isPresentationMode()) return;
  if (drawingController.isActive() && drawingTargetSelect?.value === "slide") {
    detachDrawings();
  } else {
    if (drawingController.isActive()) detachDrawings();
    drawingTargetSelect.value = "slide";
    switchDrawing();
  }
  updatePresentationDrawingButton();
  updatePresentationCameraButton();
});

const enterPresentationMode = async function () {
  if (isPresentationMode()) {
    return false;
  }

  if (!scene) {
    return false;
  }

  const validation = validatePresentationStart();

  if (!validation.ok) {
    console.warn(validation.message);

    return false;
  }

  // =====================================
  // 未Apply編集を確定させず破棄
  // =====================================

  if (dirtyMultiInspectorFields.size > 0) {
    discardAllPendingMultiInspectorChanges();
  }

  // Context menuなどを閉じる
  closeSlideContextMenu();

  // Match existing Pending behavior: only applied BGM settings are used.
  refreshProjectBgmUi();

  // =====================================
  // Mode
  // =====================================

  if (drawingController.isActive()) detachDrawings();
  // Selection highlights are editor-only; never render them on top in presentation.
  slideDrawing.clearSelection();
  drawingController.clearScreenSelection();
  setSlideDrawingTool("brush");
  updateDrawingSelectionButtons();
  // Presentation starts with navigation disabled, regardless of Editor state.
  stopPresentationCameraControl();
  syncPresentationBrushPalette();
  presentationDrawingSnapshot = new Map(slideStates.map(slide => [slide.id, structuredClone(slide.drawings ?? [])]));
  presentationDrawingUndoStack.length = presentationDrawingRedoStack.length = 0;
  refreshPresentationDrawingHistoryUi();

  updatePresentationDrawingButton();

  appMode = APP_MODE_PRESENTATION;
  updatePresentationCameraButton();

  refreshPresentationFullscreenButton();

  // =====================================
  // Presentation Start Slide
  // =====================================

  if (
    presentationSettings.startMode === PRESENTATION_START_FIRST &&
    slideStates.length > 0
  ) {
    currentSlideIndex = 0;
  }

  // =====================================
  // Session
  // =====================================

  const enteringSession = beginPresentationSession();

  if (presentationSettings.autoPlayOnStart) {
    startPresentationAutoPlay();
  } else {
    pausePresentationAutoPlay();
  }

  // =====================================
  // Editor専用表示を外す
  // =====================================

  detachEditorGizmosForPresentation();

  // =====================================
  // HUD
  // =====================================

  refreshAppModeUi();

  applyPresentationHudMode();

  refreshPresentationControls();

  if (presentationControls) {
    presentationControls.hidden = false;
  }

  startPresentationHudTimer();

  showPresentationHudTemporarily();
  switchAction();

  // =====================================
  // Presentation Camera
  //
  // Current Slideから開始
  // =====================================

  try {
    const ready = await currentSlide();
    if (presentationSession !== enteringSession || !isPresentationMode()) {
      return false;
    }
    if (ready === false) {
      await exitPresentationMode();
      return false;
    }
    await enterPresentationFullscreen();
  } catch (error) {
    if (presentationSession === enteringSession) {
      try {
        await exitPresentationMode();
      } catch (cleanupError) {
        console.warn("Presentation cleanup failed:", cleanupError);
      }
    }

    throw error;
  }

  return presentationSession === enteringSession && isPresentationMode();
};

const exitPresentationMode = async function () {
  if (!isPresentationMode()) {
    return false;
  }

  finishPresentationDrawings();
  stopPresentationCameraControl();

  cleanupPresentationRuntime();
  disposeAction(); // Never leave the Open URL control in Editor mode.

  resetPresentationControls();

  const finishedSession = endPresentationSession();

  appMode = APP_MODE_EDITOR;

  refreshAppModeUi();

  await exitPresentationFullscreen();

  await restoreEditorAfterPresentation();

  return true;
};

const togglePresentationMode = async function () {
  if (isPresentationMode()) {
    return await exitPresentationMode();
  }

  return await enterPresentationMode();
};

// Scene-1T: The Scene editor follows Current whenever Current changes.
// Creating an unused Scene may temporarily select it for editing; the next
// Current change restores the Current slide's Scene as the editing target.
const syncEditingSceneToCurrentSlide = function () {
  const slideState = getCurrentSlideState();
  if (!slideState || !currentProjectData) return;
  const name = getCurrentScenePresetName();
  if (!name || editingScenePresetName === name) return;
  commitAssetTransformNumericEdit();
  detachAssetGizmo();
  selectedSceneAssetId = null;
  editingScenePresetName = name;
  environmentEditTarget = "preset";
  refreshEditingScenePresetSelector();
  refreshEnvironmentEditTargetUi();
  syncEnvironmentUi(getEnvironmentForEditorDisplay());
  refreshSceneAssetEditor();
  syncEditingSceneAssetGizmo();
};

const refreshCurrentSlideEditorUi = function () {
  syncEditingSceneToCurrentSlide();
  const slideState = getCurrentSlideState();

  // =====================================
  // Common Editor UI
  // Current Slideの有無にかかわらず更新
  // =====================================

  renderSlideThumbnails();

  refreshSlideSettingsInspector();

  refreshSceneAssetEditor();

  refreshSlideManagementUi();

  refreshSlideInspectorTitle();

  refreshCurrentSlidePropertiesUi();

  // =====================================
  // No Current Slide
  // =====================================

  if (!slideState) {
    detachAssetGizmo();

    detachSlideGizmo();

    return;
  }

  // =====================================
  // Current Slide Environment
  // =====================================

  syncSkyboxEditorFromEnvironment();

  // =====================================
  // Asset Gizmo
  // =====================================

  if (assetGizmoMode !== "off" && getSelectedSceneAssetConfig()) {
    attachGizmoToSelectedAsset();
  } else {
    detachAssetGizmo();
  }

  // =====================================
  // Slide Gizmo
  // =====================================

  if (slideGizmoMode !== "off" && slideState.mesh) {
    attachGizmoToCurrentSlide();
  } else {
    detachSlideGizmo();
  }
};

const applyCurrentSlidePresentationState = async function () {
  const applied = await applyCurrentSlideSceneState();

  if (!applied) {
    return false;
  }

  // Presentation中は
  // Editor Gizmoを絶対表示しない
  detachAssetGizmo();

  detachSlideGizmo();

  return true;
};

const applyCurrentSlideForAppMode = async function () {
  if (isPresentationMode()) {
    return await applyCurrentSlidePresentationState();
  }

  return await applyCurrentSlideEditorState();
};

const getSlideNavigationConfig = function (direction, departureSlide) {
  if (!departureSlide) {
    return null;
  }

  const sound = resolveSound(currentProjectData, departureSlide);

  const transition = resolveTransition(currentProjectData, departureSlide);

  switch (direction) {
    case SLIDE_NAV_PREVIOUS:
      return {
        soundId: sound.previous,
        ...transitionTiming(transition, 'previous'),
      };

    case SLIDE_NAV_CURRENT:
      return {
        soundId: sound.current,
        ...transitionTiming(transition, 'current'),
      };

    case SLIDE_NAV_NEXT:
      return {
        soundId: sound.next,
        ...transitionTiming(transition, 'next'),
      };

    case SLIDE_NAV_JUMP:
      return {
        soundId: sound.current,
        ...transitionTiming(transition, 'current'),
      };

    default:
      console.warn("Unknown slide navigation direction:", direction);

      return null;
  }
};

const getSlideNavigationTargetIndex = function (
  direction,
  fromIndex,
  { loop = true } = {},
) {
  const count = slideStates.length;

  if (count === 0) {
    return -1;
  }

  switch (direction) {
    case SLIDE_NAV_PREVIOUS:
      if (fromIndex <= 0) {
        return loop ? count - 1 : 0;
      }

      return fromIndex - 1;

    case SLIDE_NAV_CURRENT:
      return Math.min(Math.max(fromIndex, 0), count - 1);

    case SLIDE_NAV_NEXT:
      if (fromIndex >= count - 1) {
        return loop ? 0 : count - 1;
      }

      return fromIndex + 1;

    default:
      return fromIndex;
  }
};

const applySlideNavigationButtonEffect = function (direction) {
  if (!isEditorMode()) {
    return;
  }

  switch (direction) {
    case SLIDE_NAV_PREVIOUS:
      applyButtonEffect(previousSlideButton);
      break;

    case SLIDE_NAV_CURRENT:
      applyButtonEffect(currentSlideButton);
      break;

    case SLIDE_NAV_NEXT:
      applyButtonEffect(nextSlideButton);
      break;
  }
};

const navigateSlide = async function (direction) {
  // =====================================
  // Button Effect
  // =====================================

  applySlideNavigationButtonEffect(direction);

  // =====================================
  // Drawing
  // =====================================

  if (drawingController.isActive()) {
    detachDrawings();
    updatePresentationDrawingButton();
  }

  // =====================================
  // Slide存在確認
  // =====================================

  if (!Array.isArray(slideStates) || slideStates.length === 0) {
    safePlayButtonAudio("NG");

    return false;
  }

  // =====================================
  // Departure Slide
  //
  // Sound / Transitionは
  // このSlideが決定する
  // =====================================

  const departureSlide = slideStates[currentSlideIndex];

  if (!departureSlide) {
    console.warn("Departure slide not found:", currentSlideIndex);

    return false;
  }

  // =====================================
  // Navigation Config
  // =====================================

  const config = getSlideNavigationConfig(direction, departureSlide);

  if (!config) {
    return false;
  }

  // =====================================
  // Sound
  // =====================================

  safePlayButtonAudio(config.soundId);

  // =====================================
  // Transition Speed
  // =====================================

  smoothSpeed = config.speed;
  activeTransitionDuration = config.mode === 'duration' ? config.duration : null;

  // =====================================
  // Destination Index
  // =====================================

  const navigationLoop = isPresentationMode() ? presentationSession.loop : true;

  const targetIndex = getSlideNavigationTargetIndex(
    direction,
    currentSlideIndex,
    {
      loop: navigationLoop,
    },
  );

  if (targetIndex < 0) {
    return false;
  }

  const actuallyMoves = targetIndex !== currentSlideIndex;

  if (direction !== SLIDE_NAV_CURRENT && !actuallyMoves) {
    return false;
  }

  currentSlideIndex = targetIndex;
  if (isEditorMode()) setSingleSlideSelection(targetIndex);
  ensureCurrentSlideSelected();

  // =====================================
  // BGM
  // =====================================

  if (isPresentationMode()) {
    void syncPresentationBgmForCurrentSlide();
  }

  // =====================================
  // Camera Transition
  // =====================================

  setCameraTransitionTarget();

  // =====================================
  // Scene / Editor / Presentation State
  // =====================================

  await applyCurrentSlideForAppMode();

  // =====================================
  // Current Slide State
  // =====================================

  refreshCurrentSlideState();

  // =====================================
  // Presentation Session
  // =====================================

  finishPresentationNavigation(direction, {
    refreshUi: true,
  });

  return true;
};

const navigateSlideToIndex = async function (
  targetIndex,
  {
    soundMode = SLIDE_NAV_JUMP,

    transitionMode = SLIDE_NAV_JUMP,
  } = {},
) {
  // =====================================
  // Validation
  // =====================================

  if (!Array.isArray(slideStates) || slideStates.length === 0) {
    return false;
  }

  if (
    !Number.isInteger(targetIndex) ||
    targetIndex < 0 ||
    targetIndex >= slideStates.length
  ) {
    console.warn("Invalid slide target index:", targetIndex);

    return false;
  }

  // =====================================
  // Same Slide
  // =====================================

  if (targetIndex === currentSlideIndex) {
    return true;
  }

  // =====================================
  // Departure Slide
  // =====================================

  const departureSlide = getCurrentSlideState();

  const destinationSlide = slideStates[targetIndex];

  if (!departureSlide || !destinationSlide) {
    return false;
  }

  // =====================================
  // Sound
  //
  // Jump sound belongs to
  // the destination slide.
  //
  // Other navigation sounds belong to
  // the departure slide.
  // =====================================

  const soundSlide =
    soundMode === SLIDE_NAV_JUMP ? destinationSlide : departureSlide;

  const soundConfig = getSlideNavigationConfig(soundMode, soundSlide);

  // =====================================
  // Transition
  //
  // Transition is always decided by
  // the departure slide.
  // =====================================

  const transitionConfig = getSlideNavigationConfig(
    transitionMode,
    departureSlide,
  );

  if (soundConfig?.soundId) {
    safePlayButtonAudio(soundConfig.soundId);
  }

  if (Number.isFinite(transitionConfig?.speed)) {
    smoothSpeed = transitionConfig.speed;
  }
  activeTransitionDuration = transitionConfig?.mode === 'duration' ? transitionConfig.duration : null;

  // =====================================
  // Change Current Slide
  // =====================================

  currentSlideIndex = targetIndex;

  // =====================================
  // BGM
  // =====================================

  if (isPresentationMode()) {
    void syncPresentationBgmForCurrentSlide();
  }

  // =====================================
  // Camera Transition
  // =====================================

  setCameraTransitionTarget();

  // =====================================
  // Scene / Editor / Presentation State
  // =====================================

  await applyCurrentSlideForAppMode();

  // =====================================
  // Current Slide State
  // =====================================

  refreshCurrentSlideState();

  // =====================================
  // Presentation Session
  // =====================================

  finishPresentationNavigation(SLIDE_NAV_JUMP);

  return true;
};

// ============================================================
// 6D. Presentation Runtime
// ============================================================
//
// Presentation Session / HUD / Controls / Overview /
// AutoPlay / BGM / Presentation lifecycle。
//
// Slide Navigation自体はEditorとPresentationで共有するため、
// このSectionの外側に置く。

const applyPresentationSettingsFromProjectData = function () {
  const normalized = normalizePresentationSettings(
    currentProjectData?.presentationSettings,
  );

  Object.assign(presentationSettings, normalized);
};

const refreshPresentationSettingsUi = function () {
  if (presentationStartMode) {
    presentationStartMode.value = presentationSettings.startMode;
  }

  if (presentationLoop) {
    presentationLoop.checked = presentationSettings.loop;
  }

  if (presentationAutoFullscreen) {
    presentationAutoFullscreen.checked = presentationSettings.autoFullscreen;
  }

  if (presentationHudMode) {
    presentationHudMode.value = presentationSettings.hudMode;
  }

  if (presentationTimeMode) {
    presentationTimeMode.value = presentationSettings.timeMode;
  }

  if (presentationAutoPlayOnStart) {
    presentationAutoPlayOnStart.checked = presentationSettings.autoPlayOnStart;
  }

  if (presentationAutoPlayInterval) {
    presentationAutoPlayInterval.value = String(
      presentationSettings.autoPlayIntervalSeconds,
    );
  }
};

const applyPresentationSettingsFromUi = function (event) {
  const fields = {
    presentationStartMode: "startMode", presentationLoop: "loop",
    presentationAutoFullscreen: "autoFullscreen", presentationHudMode: "hudMode",
    presentationTimeMode: "timeMode", presentationAutoPlayOnStart: "autoPlayOnStart",
    presentationAutoPlayInterval: "autoPlayIntervalSeconds",
  };
  const control = event?.target;
  const field = fields[control?.id];
  if (!field) return normalizePresentationSettings(presentationSettings);
  const value = control.type === "checkbox" ? control.checked : control.value;
  if (field === "autoPlayIntervalSeconds" && (!String(value).trim() || !Number.isFinite(Number(value)) || Number(value) < 0.1 || Number(value) > 3600)) return false;
  const edit = beginSettingsEdit();
  if (!edit) return false;
  Object.assign(presentationSettings, normalizePresentationSettings({...presentationSettings, [field]:value}));
  finishSettingsEdit(edit);
  refreshPresentationSettingsUi();
  return true;
};

const createPresentationSession = function () {
  return {
    bgm: normalizeProjectBgm(),

    settings: normalizePresentationSettings(),

    active: false,

    startSlideIndex: -1,

    enteredAt: null,

    navigationCount: 0,

    lastDirection: SLIDE_NAV_CURRENT,

    loop: true,
  };
};

const beginPresentationSession = function () {
  stopPresentationBgm();

  presentationSession = createPresentationSession();

  presentationSession.bgm = normalizeProjectBgm();

  presentationSession.settings =
    normalizePresentationSettings(presentationSettings);

  presentationSession.active = true;

  presentationSession.startSlideIndex = currentSlideIndex;

  presentationSession.enteredAt = performance.now();

  presentationSession.loop = presentationSession.settings.loop;

  return presentationSession;
};

const endPresentationSession = function () {
  const finishedSession = {
    ...presentationSession,
  };

  presentationSession = createPresentationSession();

  return finishedSession;
};

const recordPresentationNavigation = function (direction) {
  if (!isPresentationMode() || !presentationSession.active) {
    return;
  }

  presentationSession.lastDirection = direction;

  if (direction !== SLIDE_NAV_CURRENT) {
    presentationSession.navigationCount++;
  }
};

const getPresentationElapsedSeconds = function () {
  if (
    !presentationSession.active ||
    !Number.isFinite(presentationSession.enteredAt)
  ) {
    return 0;
  }

  return (performance.now() - presentationSession.enteredAt) / 1000;
};

const getPresentationSessionInfo = function () {
  return {
    active: presentationSession.active,

    startSlideIndex: presentationSession.startSlideIndex,

    currentSlideIndex,

    slideCount: slideStates.length,

    navigationCount: presentationSession.navigationCount,

    lastDirection: presentationSession.lastDirection,

    loop: presentationSession.loop,

    elapsedSeconds: getPresentationElapsedSeconds(),
  };
};

const refreshPresentationHud = function () {
  if (!isPresentationMode() || !presentationSession.active) {
    return;
  }

  const info = getPresentationSessionInfo();

  // =====================================
  // Slide
  // =====================================

  presentationSlideNumber.textContent =
    info.currentSlideIndex >= 0 ? String(info.currentSlideIndex + 1) : "0";

  presentationSlideCount.textContent = String(info.slideCount);

  // =====================================
  // Time
  // =====================================

  switch (presentationSettings.timeMode) {
    case PRESENTATION_TIME_ELAPSED:
      presentationElapsedTime.hidden = false;

      presentationElapsedTime.textContent = formatPresentationElapsedTime(
        info.elapsedSeconds,
      );

      break;

    case PRESENTATION_TIME_CLOCK:
      presentationElapsedTime.hidden = false;

      presentationElapsedTime.textContent = formatPresentationClock();

      break;

    case PRESENTATION_TIME_OFF:
    default:
      presentationElapsedTime.hidden = true;

      break;
  }

  // =====================================
  // Loop
  // =====================================

  presentationLoopStatus.textContent = info.loop ? "LOOP" : "NO LOOP";
};

const stopPresentationHudTimer = function () {
  if (presentationHudTimerId !== null) {
    window.clearInterval(presentationHudTimerId);

    presentationHudTimerId = null;
  }
};

const startPresentationHudTimer = function () {
  stopPresentationHudTimer();

  refreshPresentationHud();

  presentationHudTimerId = window.setInterval(() => {
    if (!isPresentationMode() || !presentationSession.active) {
      return;
    }

    refreshPresentationHud();
    refreshInteractionButtonVisual();
  }, 250);
};

let presentationHudSlideRevealUntil = 0;

const showPresentationHudTemporarily = function ({ slideChange = false } = {}) {
  if (!isPresentationMode() || !presentationOverlay) {
    return;
  }

  // =====================================
  // HUD Off
  // =====================================

  if (presentationSettings.hudMode === PRESENTATION_HUD_OFF) {
    return;
  }

  // =====================================
  // Always
  // =====================================

  if (presentationSettings.hudMode === PRESENTATION_HUD_ALWAYS) {
    presentationOverlay.classList.remove("idle");

    return;
  }

  // Follow the controls, except for a timed reveal on slide changes.
  if (presentationSettings.hudMode === PRESENTATION_HUD_BAR_LINKED) {
    if (!slideChange) return;
    presentationHudSlideRevealUntil = Date.now() + PRESENTATION_HUD_IDLE_DELAY;
    presentationOverlay.classList.remove("idle");
    if (presentationHudIdleTimeoutId !== null) window.clearTimeout(presentationHudIdleTimeoutId);
    presentationHudIdleTimeoutId = window.setTimeout(() => {
      presentationHudIdleTimeoutId = null;
      if (isPresentationMode() && presentationSettings.hudMode === PRESENTATION_HUD_BAR_LINKED && !presentationControls?.classList.contains("visible")) {
        presentationOverlay?.classList.add("idle");
      }
    }, PRESENTATION_HUD_IDLE_DELAY);
    return;
  }

  // =====================================
  // Auto Dim
  // =====================================

  presentationOverlay.classList.remove("idle");

  if (presentationHudIdleTimeoutId !== null) {
    window.clearTimeout(presentationHudIdleTimeoutId);
  }

  presentationHudIdleTimeoutId = window.setTimeout(() => {
    if (isPresentationMode()) {
      presentationOverlay.classList.add("idle");
    }

    presentationHudIdleTimeoutId = null;
  }, PRESENTATION_HUD_IDLE_DELAY);
};

const resetPresentationHudIdleState = function () {
  if (presentationHudIdleTimeoutId !== null) {
    window.clearTimeout(presentationHudIdleTimeoutId);

    presentationHudIdleTimeoutId = null;
  }

  presentationOverlay?.classList.remove("idle");
};

const applyPresentationHudMode = function () {
  if (!presentationOverlay) {
    return;
  }

  switch (presentationSettings.hudMode) {
    case PRESENTATION_HUD_OFF:
      presentationOverlay.hidden = true;

      presentationOverlay.classList.remove("idle");

      break;

    case PRESENTATION_HUD_ALWAYS:
      presentationOverlay.hidden = false;

      presentationOverlay.classList.remove("idle");

      break;

    case PRESENTATION_HUD_BAR_LINKED:
      presentationOverlay.hidden = false;
      presentationOverlay.classList.toggle("idle", !presentationControls?.classList.contains("visible") && Date.now() >= presentationHudSlideRevealUntil);
      break;

    case PRESENTATION_HUD_AUTO_DIM:
    default:
      presentationOverlay.hidden = false;

      break;
  }
};

const enterPresentationFullscreen = async function () {
  presentationEnteredFullscreen = false;

  if (!presentationSettings.autoFullscreen) {
    return;
  }

  if (document.fullscreenElement) {
    return;
  }

  try {
    await document.documentElement.requestFullscreen();

    presentationEnteredFullscreen = true;
  } catch (error) {
    console.warn("Presentation fullscreen failed:", error);

    showAppNotice("Fullscreen表示を開始できませんでした。", {
      level: "warning",
    });
  }
};

const exitPresentationFullscreen = async function () {
  if (!presentationEnteredFullscreen) {
    return;
  }

  presentationEnteredFullscreen = false;

  if (!document.fullscreenElement) {
    return;
  }

  try {
    await document.exitFullscreen();
  } catch (error) {
    console.warn("Exit fullscreen failed:", error);

    showAppNotice("Fullscreen表示を終了できませんでした。", {
      level: "warning",
    });
  }
};

const refreshPresentationControls = function () {
  const count = slideStates.length;

  presentationControlSlideNumber.textContent =
    currentSlideIndex >= 0 ? String(currentSlideIndex + 1) : "0";

  presentationControlSlideCount.textContent = String(count);

  const loop = presentationSession.active
    ? presentationSession.loop
    : presentationSettings.loop;

  if (presentationPreviousButton) {
    presentationPreviousButton.disabled = !loop && currentSlideIndex <= 0;
  }

  if (presentationNextButton) {
    presentationNextButton.disabled = !loop && currentSlideIndex >= count - 1;
  }

  if (presentationProgressBar) {
    const count = slideStates.length;

    let progress = 0;

    if (count === 1) {
      progress = 100;
    } else if (count > 1 && currentSlideIndex >= 0) {
      progress = (currentSlideIndex / (count - 1)) * 100;
    }

    presentationProgressBar.style.width = `${progress}%`;
  }

  if (presentationProgressTrack) {
    const count = slideStates.length;

    presentationProgressTrack.setAttribute(
      "aria-valuemax",
      String(Math.max(1, count)),
    );

    presentationProgressTrack.setAttribute(
      "aria-valuenow",
      String(currentSlideIndex >= 0 ? currentSlideIndex + 1 : 1),
    );
  }
};

let presentationControlsPinned = false;
const presentationControlsPinButton = document.getElementById("presentationControlsPinButton");
presentationControlsPinButton?.addEventListener("click", () => {
  presentationControlsPinned = !presentationControlsPinned;
  presentationControlsPinButton.setAttribute("aria-pressed", String(presentationControlsPinned));
  presentationControlsPinButton.textContent = presentationControlsPinned ? "📌" : "📍";
  showPresentationControls({ autoHide: false });
  uiSound.play();
});
const showPresentationControls = function ({ autoHide = true } = {}) {
  if (!isPresentationMode() || !presentationControls) {
    return;
  }

  presentationControls.hidden = false;

  presentationControls.classList.add("visible");
  if (presentationSettings.hudMode === PRESENTATION_HUD_BAR_LINKED) {
    presentationOverlay?.classList.remove("idle");
  }

  clearPresentationControlsHideTimer();

  if (!autoHide || presentationControlsPinned) {
    return;
  }

  presentationControlsHideTimeoutId = window.setTimeout(() => {
    hidePresentationControls();
  }, PRESENTATION_CONTROLS_HIDE_DELAY);
};

const hidePresentationControls = function () {
  if (presentationControlsPinned) return;
  if (!presentationControls) {
    return;
  }

  clearPresentationControlsHideTimer();

  presentationControls.classList.remove("visible");
  if (presentationSettings.hudMode === PRESENTATION_HUD_BAR_LINKED) {
    if (Date.now() >= presentationHudSlideRevealUntil) presentationOverlay?.classList.add("idle");
  }
};

const resetPresentationControls = function () {
  if (presentationControlsHideTimeoutId !== null) {
    window.clearTimeout(presentationControlsHideTimeoutId);

    presentationControlsHideTimeoutId = null;
  }

  if (!presentationControls) {
    return;
  }

  presentationControls.classList.remove("visible");
  if (presentationSettings.hudMode === PRESENTATION_HUD_BAR_LINKED) {
    if (Date.now() >= presentationHudSlideRevealUntil) presentationOverlay?.classList.add("idle");
  }

  presentationControls.hidden = true;

  presentationProgressScrubbing = false;

  presentationProgressPreviewIndex = -1;

  if (presentationProgressPreview) {
    presentationProgressPreview.hidden = true;
  }
};

const refreshPresentationFullscreenButton = function () {
  if (!presentationFullscreenButton) {
    return;
  }

  presentationFullscreenButton.textContent = document.fullscreenElement
    ? "▣"
    : "⛶";

  presentationFullscreenButton.title = document.fullscreenElement
    ? "Exit fullscreen"
    : "Enter fullscreen";
};

const clearPresentationControlsHideTimer = function () {
  if (presentationControlsHideTimeoutId !== null) {
    window.clearTimeout(presentationControlsHideTimeoutId);

    presentationControlsHideTimeoutId = null;
  }
};

const beginPresentationSlideJump = function () {
  if (
    !isPresentationMode() ||
    !presentationSlideJumpButton ||
    !presentationSlideJumpInput
  ) {
    return;
  }

  presentationSlideJumpEditing = true;

  presentationSlideJumpButton.hidden = true;

  presentationSlideJumpInput.hidden = false;

  presentationSlideJumpInput.min = "1";

  presentationSlideJumpInput.max = String(slideStates.length);

  presentationSlideJumpInput.value = String(currentSlideIndex + 1);

  presentationSlideJumpInput.focus();

  presentationSlideJumpInput.select();

  showPresentationControls({
    autoHide: false,
  });
};

const endPresentationSlideJump = function () {
  presentationSlideJumpEditing = false;

  if (presentationSlideJumpButton) {
    presentationSlideJumpButton.hidden = false;
  }

  if (presentationSlideJumpInput) {
    presentationSlideJumpInput.hidden = true;
  }
};

const commitPresentationSlideJump = async function () {
  if (!presentationSlideJumpInput) {
    return false;
  }

  // =====================================
  // Read Slide Number
  // UI uses 1-based numbering
  // =====================================

  const slideNumber = Number.parseInt(presentationSlideJumpInput.value, 10);

  // =====================================
  // Invalid Number
  // =====================================

  if (!Number.isInteger(slideNumber)) {
    presentationSlideJumpInput.value = String(currentSlideIndex + 1);

    presentationSlideJumpInput.select();

    return false;
  }

  // =====================================
  // Convert to 0-based Index
  // =====================================

  const targetIndex = slideNumber - 1;

  // =====================================
  // Range Check
  // =====================================

  if (targetIndex < 0 || targetIndex >= slideStates.length) {
    presentationSlideJumpInput.value = String(currentSlideIndex + 1);

    presentationSlideJumpInput.select();

    return false;
  }

  // =====================================
  // Finish Editing
  // =====================================

  endPresentationSlideJump();

  // =====================================
  // Same Slide
  // =====================================

  if (targetIndex === currentSlideIndex) {
    refreshPresentationControls();

    showPresentationControls({
      autoHide: false,
    });

    return true;
  }

  // =====================================
  // Navigate
  // =====================================

  const result = await navigateSlideToIndex(targetIndex);

  // =====================================
  // Navigation Failed
  // =====================================

  if (!result) {
    refreshPresentationControls();

    showPresentationControls({
      autoHide: false,
    });

    return false;
  }

  // =====================================
  // Presentation UI
  // =====================================

  refreshPresentationControls();

  refreshPresentationHud();

  showPresentationControls({
    autoHide: false,
  });

  showPresentationHudTemporarily({ slideChange: true });

  return true;
};

const getPresentationProgressTargetIndex = function (clientX) {
  if (!presentationProgressTrack || slideStates.length === 0) {
    return -1;
  }

  const rect = presentationProgressTrack.getBoundingClientRect();

  if (rect.width <= 0) {
    return -1;
  }

  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));

  const index = Math.round(ratio * (slideStates.length - 1));

  return Math.min(slideStates.length - 1, Math.max(0, index));
};

const updatePresentationProgressPreview = function (clientX) {
  if (!presentationProgressTrack || !presentationProgressPreview) {
    return;
  }

  const targetIndex = getPresentationProgressTargetIndex(clientX);

  if (targetIndex < 0) {
    return;
  }

  presentationProgressPreviewIndex = targetIndex;

  const rect = presentationProgressTrack.getBoundingClientRect();

  const ratio =
    slideStates.length <= 1 ? 0 : targetIndex / (slideStates.length - 1);

  presentationProgressPreview.hidden = false;

  presentationProgressPreview.textContent = `${targetIndex + 1} / ${
    slideStates.length
  }`;

  presentationProgressPreview.style.left = `${ratio * 100}%`;
};

const beginPresentationProgressScrub = function (event) {
  if (!isPresentationMode() || slideStates.length === 0) {
    return;
  }

  presentationProgressScrubbing = true;

  presentationProgressTrack?.setPointerCapture(event.pointerId);

  updatePresentationProgressPreview(event.clientX);

  showPresentationControls({
    autoHide: false,
  });
};

const movePresentationProgressScrub = function (event) {
  if (!presentationProgressScrubbing) {
    return;
  }

  updatePresentationProgressPreview(event.clientX);

  showPresentationControls({
    autoHide: false,
  });
};

const endPresentationProgressScrub = async function (event) {
  if (!presentationProgressScrubbing) {
    return;
  }

  presentationProgressScrubbing = false;

  if (presentationProgressTrack?.hasPointerCapture(event.pointerId)) {
    presentationProgressTrack.releasePointerCapture(event.pointerId);
  }

  const targetIndex = presentationProgressPreviewIndex;

  presentationProgressPreviewIndex = -1;

  if (presentationProgressPreview) {
    presentationProgressPreview.hidden = true;
  }

  if (targetIndex < 0 || targetIndex >= slideStates.length) {
    showPresentationControls({
      autoHide: false,
    });

    return;
  }

  if (targetIndex === currentSlideIndex) {
    refreshPresentationControls();

    showPresentationControls({
      autoHide: false,
    });

    return;
  }

  const result = await navigateSlideToIndex(targetIndex);

  if (!result) {
    refreshPresentationControls();

    showPresentationControls({
      autoHide: false,
    });

    return;
  }

  refreshPresentationControls();

  refreshPresentationHud();

  showPresentationControls({
    autoHide: false,
  });

  showPresentationHudTemporarily({ slideChange: true });
};

const createPresentationOverviewSlide = function (slideState, index) {
  const button = document.createElement("button");

  button.type = "button";

  button.className = "presentation-overview-slide";

  button.dataset.slideIndex = String(index);

  button.setAttribute("aria-label", `Slide ${index + 1}`);

  // =====================================
  // Current
  // =====================================

  if (index === currentSlideIndex) {
    button.classList.add("current");

    const marker = document.createElement("div");

    marker.className = "presentation-overview-current-marker";

    marker.textContent = "CURRENT";

    button.appendChild(marker);
  }

  // =====================================
  // Image
  // =====================================

  if (slideState.imageUrl) {
    const image = document.createElement("img");

    image.className = "presentation-overview-slide-image";

    image.src = slideState.imageUrl;

    image.alt = "";

    image.draggable = false;

    button.appendChild(image);
  } else {
    button.classList.add("no-image");
  }

  // =====================================
  // Shade
  // =====================================

  const shade = document.createElement("div");

  shade.className = "presentation-overview-slide-shade";

  button.appendChild(shade);

  // =====================================
  // Number
  // =====================================

  const number = document.createElement("div");

  number.className = "presentation-overview-slide-number";

  number.textContent = String(index + 1);

  button.appendChild(number);

  // =====================================
  // Label
  // =====================================

  const label = document.createElement("div");

  label.className = "presentation-overview-slide-label";

  label.textContent = slideState.label ?? "";

  button.appendChild(label);

  return button;
};

const renderPresentationOverview = function () {
  if (!presentationOverviewGrid) {
    return;
  }

  presentationOverviewGrid.replaceChildren();

  // =====================================
  // Filter
  // =====================================

  presentationOverviewFilteredIndices =
    getPresentationOverviewFilteredIndices();

  // =====================================
  // Cards
  // =====================================

  presentationOverviewFilteredIndices.forEach((index) => {
    const slideState = slideStates[index];

    if (!slideState) {
      return;
    }

    const card = createPresentationOverviewSlide(slideState, index);

    if (index === presentationOverviewFocusedIndex) {
      card.classList.add("keyboard-focus");
    }

    presentationOverviewGrid.appendChild(card);
  });

  // =====================================
  // Status
  // =====================================

  if (presentationOverviewStatus) {
    const total = slideStates.length;

    const visible = presentationOverviewFilteredIndices.length;

    if (visible === total) {
      presentationOverviewStatus.textContent = `${
        currentSlideIndex + 1
      } / ${total}`;
    } else {
      presentationOverviewStatus.textContent = `${visible} matches / ${total}`;
    }
  }

  // =====================================
  // Empty Search Result
  // =====================================

  if (presentationOverviewFilteredIndices.length === 0) {
    const empty = document.createElement("div");

    empty.className = "presentation-overview-empty";

    empty.textContent = "No matching slides";

    presentationOverviewGrid.appendChild(empty);

    return;
  }

  // =====================================
  // Scroll Focus / Current
  // =====================================

  requestAnimationFrame(() => {
    const focusedCard = presentationOverviewGrid?.querySelector(
      ".presentation-overview-slide.keyboard-focus",
    );

    if (focusedCard) {
      focusedCard.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });

      return;
    }

    const currentCard = presentationOverviewGrid?.querySelector(
      ".presentation-overview-slide.current",
    );

    currentCard?.scrollIntoView({
      block: "center",
      inline: "nearest",
    });
  });
};

const openPresentationOverview = function () {
  if (!isPresentationMode() || !presentationOverview) {
    return;
  }

  presentationAutoPlayWasRunningBeforeOverview = presentationAutoPlayRunning;

  if (presentationAutoPlayRunning) {
    pausePresentationAutoPlay();
  }

  presentationOverviewOpen = true;

  presentationOverviewFocusedIndex = currentSlideIndex;

  if (presentationOverviewSearch) {
    presentationOverviewSearch.value = "";
  }

  presentationOverview.hidden = false;

  renderPresentationOverview();

  showPresentationControls({
    autoHide: false,
  });
};

const closePresentationOverview = function () {
  presentationOverviewOpen = false;

  presentationOverviewFocusedIndex = -1;

  presentationOverviewFilteredIndices = [];

  if (presentationOverviewSearch) {
    presentationOverviewSearch.value = "";
  }

  if (presentationOverview) {
    presentationOverview.hidden = true;
  }
};

const finishPresentationOverview = function () {
  closePresentationOverview();

  resumePresentationAutoPlayAfterOverview();
};

const togglePresentationOverview = function () {
  if (presentationOverviewOpen) {
    finishPresentationOverview();
  } else {
    openPresentationOverview();
  }
};

const getPresentationOverviewFilteredIndices = function () {
  const query = presentationOverviewSearch?.value?.trim()?.toLowerCase() ?? "";

  if (!query) {
    return slideStates.map((_slideState, index) => index);
  }

  return slideStates
    .map((slideState, index) => ({
      slideState,
      index,
    }))
    .filter(({ slideState, index }) => {
      const searchText = getPresentationOverviewSearchText(slideState, index);

      return searchText.includes(query);
    })
    .map(({ index }) => index);
};

const getPresentationOverviewColumnCount = function () {
  if (!presentationOverviewGrid) {
    return 1;
  }

  const cards = Array.from(
    presentationOverviewGrid.querySelectorAll(".presentation-overview-slide"),
  );

  if (cards.length <= 1) {
    return 1;
  }

  const firstTop = cards[0].getBoundingClientRect().top;

  let count = 0;

  for (const card of cards) {
    const top = card.getBoundingClientRect().top;

    if (Math.abs(top - firstTop) > 2) {
      break;
    }

    count++;
  }

  return Math.max(1, count);
};

const getPresentationOverviewFocusedPosition = function () {
  return presentationOverviewFilteredIndices.indexOf(
    presentationOverviewFocusedIndex,
  );
};

const movePresentationOverviewFocus = function (offset) {
  const indices = presentationOverviewFilteredIndices;

  if (indices.length === 0) {
    return;
  }

  let position = getPresentationOverviewFocusedPosition();

  if (position < 0) {
    position = 0;
  }

  const nextPosition = Math.min(
    indices.length - 1,
    Math.max(0, position + offset),
  );

  presentationOverviewFocusedIndex = indices[nextPosition];

  renderPresentationOverview();
};

const setPresentationOverviewFocusPosition = function (position) {
  const indices = presentationOverviewFilteredIndices;

  if (indices.length === 0) {
    return;
  }

  const safePosition = Math.min(indices.length - 1, Math.max(0, position));

  presentationOverviewFocusedIndex = indices[safePosition];

  renderPresentationOverview();
};

const activatePresentationOverviewFocusedSlide = async function () {
  const targetIndex = presentationOverviewFocusedIndex;

  if (
    !Number.isInteger(targetIndex) ||
    targetIndex < 0 ||
    targetIndex >= slideStates.length
  ) {
    return false;
  }

  // =====================================
  // Same Slide
  // =====================================

  if (targetIndex === currentSlideIndex) {
    finishPresentationOverview();

    showPresentationControls({
      autoHide: false,
    });

    return true;
  }

  // =====================================
  // Jump
  // =====================================

  const result = await navigateSlideToIndex(targetIndex);

  if (!result) {
    return false;
  }

  // =====================================
  // Close Overview
  // =====================================

  finishPresentationOverview();

  // =====================================
  // Presentation UI
  // =====================================

  refreshPresentationControls();

  refreshPresentationHud();

  showPresentationControls({
    autoHide: false,
  });

  showPresentationHudTemporarily({ slideChange: true });

  return true;
};

const handlePresentationOverviewKeydown = async function (event) {
  if (!presentationOverviewOpen) {
    return false;
  }

  const columnCount = getPresentationOverviewColumnCount();

  switch (event.key) {
    // =====================================
    // Horizontal
    // =====================================

    case "ArrowLeft":
      event.preventDefault();

      movePresentationOverviewFocus(-1);

      return true;

    case "ArrowRight":
      event.preventDefault();

      movePresentationOverviewFocus(1);

      return true;

    // =====================================
    // Vertical
    // =====================================

    case "ArrowUp":
      event.preventDefault();

      movePresentationOverviewFocus(-columnCount);

      return true;

    case "ArrowDown":
      event.preventDefault();

      movePresentationOverviewFocus(columnCount);

      return true;

    // =====================================
    // First / Last
    // =====================================

    case "Home":
      event.preventDefault();

      setPresentationOverviewFocusPosition(0);

      return true;

    case "End":
      event.preventDefault();

      setPresentationOverviewFocusPosition(
        presentationOverviewFilteredIndices.length - 1,
      );

      return true;

    // =====================================
    // Activate
    // =====================================

    case "Enter":
      event.preventDefault();

      await activatePresentationOverviewFocusedSlide();

      return true;

    // =====================================
    // 「/」キーでSearchへFocus
    // =====================================

    case "/":
      event.preventDefault();

      presentationOverviewSearch?.focus();

      presentationOverviewSearch?.select();

      return true;
  }

  return false;
};

const clearPresentationAutoPlayTimer = function () {
  if (presentationAutoPlayTimeoutId !== null) {
    window.clearTimeout(presentationAutoPlayTimeoutId);

    presentationAutoPlayTimeoutId = null;
  }
};

const canPresentationAutoPlayAdvance = function () {
  if (
    !isPresentationMode() ||
    !presentationSession.active ||
    !presentationAutoPlayRunning ||
    slideStates.length === 0
  ) {
    return false;
  }

  return true;
};

const schedulePresentationAutoPlay = function () {
  clearPresentationAutoPlayTimer();

  if (!canPresentationAutoPlayAdvance()) {
    return;
  }

  const intervalSeconds = resolveCurrentSlideAutoPlayIntervalSeconds();

  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    return;
  }

  presentationAutoPlayTimeoutId = window.setTimeout(async () => {
    presentationAutoPlayTimeoutId = null;

    if (!canPresentationAutoPlayAdvance()) {
      return;
    }

    // =================================
    // Last slide + Loop OFF
    // =================================

    if (
      !presentationSession.loop &&
      currentSlideIndex >= slideStates.length - 1
    ) {
      pausePresentationAutoPlay();

      return;
    }

    // =================================
    // Next
    // =================================

    await nextSlide();
  }, intervalSeconds * 1000);
};

const startPresentationAutoPlay = function () {
  if (!isPresentationMode() || !presentationSession.active) {
    return;
  }

  presentationAutoPlayRunning = true;

  schedulePresentationAutoPlay();

  refreshPresentationAutoPlayButton();
};

const pausePresentationAutoPlay = function () {
  presentationAutoPlayRunning = false;

  clearPresentationAutoPlayTimer();

  refreshPresentationAutoPlayButton();
};

const togglePresentationAutoPlay = function () {
  if (presentationAutoPlayRunning) {
    pausePresentationAutoPlay();
  } else {
    startPresentationAutoPlay();
  }
};

const refreshPresentationAutoPlayButton = function () {
  if (!presentationAutoPlayButton) {
    return;
  }

  if (presentationAutoPlayRunning) {
    presentationAutoPlayButton.textContent = "⏸";

    presentationAutoPlayButton.title = "Pause autoplay";

    presentationAutoPlayButton.setAttribute("aria-label", "Pause autoplay");
  } else {
    presentationAutoPlayButton.textContent = "▶";

    presentationAutoPlayButton.title = "Start autoplay";

    presentationAutoPlayButton.setAttribute("aria-label", "Start autoplay");
  }
};

const resumePresentationAutoPlayAfterOverview = function () {
  const shouldResume = presentationAutoPlayWasRunningBeforeOverview;

  presentationAutoPlayWasRunningBeforeOverview = false;

  if (!shouldResume) {
    return;
  }

  if (!isPresentationMode() || !presentationSession.active) {
    return;
  }

  startPresentationAutoPlay();
};

const reschedulePresentationAutoPlay = function () {
  if (!presentationAutoPlayRunning) {
    return;
  }

  schedulePresentationAutoPlay();
};

// BGM


const showPresentationBgmNotice = function (message = "", canRetry = false) {
  if (presentationBgmNotice) presentationBgmNotice.hidden = !message;
  if (presentationBgmMessage) presentationBgmMessage.textContent = message;
  if (presentationBgmRetryButton) presentationBgmRetryButton.hidden = !canRetry;
};

const refreshProjectBgmUi = function () {
  // BGM is configured on Scene Presets and optionally overridden per Slide.
  refreshPresetEditors();
};

// Commit only the edited field; uncommitted numeric drafts are not read.
const isCurrentPresentationBgm = function (runtime) {
  return (
    presentationBgmRuntime === runtime &&
    presentationSession === runtime.session &&
    runtime.session.active &&
    isPresentationMode()
  );
};

const stopPresentationBgm = function () {
  // =====================================
  // Crossfadeキャンセル
  // =====================================

  presentationBgmCrossfadeGeneration++;

  disposeAllPresentationBgmFadingRuntimes();

  // =====================================
  // Crossfade以外の処理
  // =====================================

  const runtime = presentationBgmRuntime;

  // 先に無効化
  presentationBgmRuntime = null;

  disposePresentationBgmRuntime(runtime);

  showPresentationBgmNotice();
};

const playPreparedPresentationBgm = async function (runtime) {
  if (
    !isCurrentPresentationBgm(runtime) ||
    !runtime.audio ||
    runtime.state === "starting" ||
    runtime.state === "playing"
  )
    return false;
  runtime.state = "starting";
  showPresentationBgmNotice();
  try {
    // No await before play(): the retry button retains the user's activation.
    await runtime.audio.play();

    if (!isCurrentPresentationBgm(runtime)) return false;
    runtime.state = "playing";
    return true;
  } catch (error) {
    if (!isCurrentPresentationBgm(runtime)) return false;
    if (error?.name === "NotAllowedError") {
      runtime.state = "blocked";
      showPresentationBgmNotice(
        "BGM を開始するにはボタンを押してください。",
        true,
      );
    } else {
      runtime.state = "error";
      showPresentationBgmNotice(
        "BGM を再生できません。音源を確認してください。",
      );
      disposePresentationBgmRuntime(runtime);
    }

    console.warn("[BGM play failed]", {
      name: error?.name,

      message: error?.message,

      soundId: runtime.config?.soundId,

      currentSlideIndex,
    });

    return false;
  }
};

const startPresentationBgm = async function (requestedConfig = null) {
  const session = presentationSession;

  if (!session?.active || !isPresentationMode()) return false;

  stopPresentationBgm();

  const config = normalizeProjectBgm(
    requestedConfig ?? resolveCurrentPresentationBgm(),
  );

  if (!config.enabled) return false;

  const runtime = {
    session,

    config,

    sceneTiming: resolveSceneBgmTiming(currentProjectData, getCurrentSlideState()),
    scenePresetId: getCurrentSlideState()?.scenePreset ?? "default",

    audio: null,

    urls: new Set(),

    state: "loading",
  };

  presentationBgmRuntime = runtime;
  try {
    const directoryHandle = currentProjectDirectoryHandle;
    const relativePath = resolveSoundAssetPath(config.soundId);
    if (!directoryHandle || !relativePath) {
      runtime.state = "error";
      showPresentationBgmNotice(
        "BGM の音源設定と Project フォルダーを確認してください。",
      );

      if (presentationBgmRuntime === runtime) {
        presentationBgmRuntime = null;
      }

      disposePresentationBgmRuntime(runtime);

      return false;
    }
    // Reuse the same ID/path and File -> Blob URL helpers as getProjectAudio().
    // A private URL set survives Scene changes and can be released independently.
    const url = await createProjectFileUrl(
      directoryHandle,
      relativePath,
      runtime.urls,
    );
    if (!isCurrentPresentationBgm(runtime)) return false;

    const audio = new Audio(url);
    runtime.audio = audio;
    audio.preload = "auto";
    audio.volume = config.volume;

    audio.loop = config.loop;
    audio.onended = () => {
      if (isCurrentPresentationBgm(runtime)) runtime.state = "ended";
    };
    audio.onerror = () => {
      if (!isCurrentPresentationBgm(runtime)) return;
      runtime.state = "error";
      showPresentationBgmNotice("BGM の音源を読み込めませんでした。");
      disposePresentationBgmRuntime(runtime);
    };
    runtime.state = "ready";
    return await playPreparedPresentationBgm(runtime);
  } catch (error) {
    if (isCurrentPresentationBgm(runtime)) {
      runtime.state = "error";
      showPresentationBgmNotice("BGM の音源を読み込めませんでした。");
      disposePresentationBgmRuntime(runtime);
      console.warn("Presentation BGM load failed:", error);
    }
    return false;
  } finally {
    // A canceled read may have created its URL after stop() already ran.
    if (!isCurrentPresentationBgm(runtime))
      disposePresentationBgmRuntime(runtime);
  }
};

const resolveCurrentPresentationBgm = function () {
  return resolveBgm(currentProjectData, getCurrentSlideState());
};

const syncPresentationBgmForCurrentSlide = async function () {
  // =====================================
  // Validation
  // =====================================

  if (!isPresentationMode() || !presentationSession?.active) {
    return false;
  }

  // =====================================
  // Resolve
  // =====================================

  const config = resolveCurrentPresentationBgm();

  const runtime = presentationBgmRuntime;

  // =====================================
  // Debug
  // =====================================

  const debugSlide = getCurrentSlideState();

  // =====================================
  // BGM Off
  //
  // まずは従来どおり即停止
  // =====================================

  if (!config.enabled || !config.soundId || config.soundId === "NONE") {
    // 現在BGMがあるならFade-out
    if (runtime?.audio) {
      return await fadeOutPresentationBgm();
    }

    return true;
  }

  // =====================================
  // 現在BGMなし
  // =====================================

  if (!runtime?.audio) {
    return await fadeInPresentationBgm(config);
  }

  // =====================================
  // 同じBGM
  //
  // 再スタートしない。
  // Volumeだけ滑らかに変更する。
  // =====================================

  const nextTiming = resolveSceneBgmTiming(currentProjectData, getCurrentSlideState());
  const nextScenePresetId = getCurrentSlideState()?.scenePreset ?? "default";
  const sceneChanged = (runtime.scenePresetId ?? "default") !== nextScenePresetId;

  if (runtime.config?.soundId === config.soundId &&
      !(sceneChanged && !nextTiming.continueSameTrack)) {
    const audio = runtime.audio;

    if (!audio) {
      return false;
    }

    const oldVolume = audio.volume;

    const newVolume = config.volume;

    // Loopは即座に反映
    audio.loop = config.loop;

    // Runtime設定も新しい値へ更新
    runtime.config = config;
    runtime.sceneTiming = nextTiming;
    runtime.scenePresetId = nextScenePresetId;

    // =====================================
    // Volumeが同じなら何もしない
    // =====================================

    if (Math.abs(oldVolume - newVolume) < 0.001) {
      audio.volume = newVolume;

      return true;
    }

    // =====================================
    // Volume Fade開始
    // =====================================

    presentationBgmCrossfadeGeneration++;

    const generation = presentationBgmCrossfadeGeneration;

    // =====================================
    // 過去のFade-out Runtimeを掃除
    // =====================================

    disposeAllPresentationBgmFadingRuntimes();

    // =====================================
    // VolumeだけFade
    // =====================================

    const fadeSeconds = nextTiming.fadeInSeconds;

    const finished = await fadePresentationBgmVolume(
      audio,
      oldVolume,
      newVolume,
      fadeSeconds,
      generation,
    );

    // =====================================
    // 別Navigationでキャンセルされた
    // =====================================

    if (generation !== presentationBgmCrossfadeGeneration) {
      return false;
    }

    // =====================================
    // 最終音量保証
    // =====================================

    if (finished && runtime.audio) {
      runtime.audio.volume = newVolume;
    }

    return finished;
  }

  // =====================================
  // 別の曲
  //
  // Crossfade
  // =====================================

  return await crossfadePresentationBgm(config);
};

const applyBgmOverrideToInspectorTargets = async function () {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const volume = slideBgmVolume.valueAsNumber;

  if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
    return false;
  }

  const next = normalizeSlideBgmOverride({
    enabled: slideBgmEnabled.checked,

    soundId: slideBgmSoundSelect.value,

    volume,

    loop: slideBgmLoop.checked,
  });

  const changes = [];

  for (const { slideState } of entries) {
    const target = getSlideOverrideObject(slideState, "bgm");

    if (!target) {
      continue;
    }

    for (const propertyName of ["enabled", "soundId", "volume", "loop"]) {
      const before = target[propertyName];

      const after = next[propertyName];

      if (Object.is(before, after)) {
        continue;
      }

      if (after === undefined) {
        delete target[propertyName];
      } else {
        target[propertyName] = structuredClone(after);
      }

      changes.push({
        slideId: slideState.id,

        group: "bgm",

        propertyName,

        before: before === undefined ? undefined : structuredClone(before),

        after: after === undefined ? undefined : structuredClone(after),
      });
    }
  }

  if (changes.length === 0) {
    return false;
  }

  pushEditorHistory({
    type: "slide-multi-property-batch",

    changes,
  });

  refreshSlideSettingsInspector();

  return true;
};

const clearBgmOverrideFromInspectorTargets = async function () {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];

  for (const { slideState } of entries) {
    const target = getSlideOverrideObject(slideState, "bgm");

    if (!target) {
      continue;
    }

    for (const propertyName of ["enabled", "soundId", "volume", "loop", "fadeInSeconds", "fadeOutSeconds", "continueSameTrack"]) {
      if (!Object.prototype.hasOwnProperty.call(target, propertyName)) {
        continue;
      }

      const before = structuredClone(target[propertyName]);

      delete target[propertyName];

      changes.push({
        slideId: slideState.id,

        group: "bgm",

        propertyName,

        before,

        after: undefined,
      });
    }
  }
  if (changes.length === 0) {
    return false;
  }

  pushEditorHistory({
    type: "slide-multi-property-batch",

    changes,
  });

  refreshSlideSettingsInspector();

  return true;
};

const enableBgmOverrideForInspectorTargets = async function () {
  const entries = getSlideInspectorTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  const changes = [];

  for (const { slideState } of entries) {
    const effective = resolveBgm(currentProjectData, slideState);

    const target = getSlideOverrideObject(slideState, "bgm");

    const next = normalizeSlideBgmOverride({
      enabled: effective.enabled,

      soundId: effective.soundId,

      volume: effective.volume,

      loop: effective.loop,
      ...resolveSceneBgmTiming(currentProjectData, slideState),
    });

    for (const propertyName of ["enabled", "soundId", "volume", "loop"]) {
      const before = target[propertyName];

      const after = next[propertyName];

      if (Object.is(before, after)) {
        continue;
      }

      target[propertyName] = structuredClone(after);

      changes.push({
        slideId: slideState.id,

        group: "bgm",

        propertyName,

        before: before === undefined ? undefined : structuredClone(before),

        after: structuredClone(after),
      });
    }
  }

  if (changes.length === 0) {
    refreshSlideSettingsInspector();

    return false;
  }

  pushEditorHistory({
    type: "slide-multi-property-batch",

    changes,
  });

  refreshSlideSettingsInspector();

  return true;
};

const formatBgmSummary = function (config) {
  const bgm = normalizeProjectBgm(config);

  if (!bgm.enabled) {
    return "Effective: Off";
  }

  if (!bgm.soundId) {
    return "Effective: None";
  }

  return (
    `Effective: ${bgm.soundId}` +
    ` / Volume ${bgm.volume}` +
    ` / ${bgm.loop ? "Loop" : "Once"}`
  );
};

const refreshSlideBgmSoundOptions = function (selectedSoundId = "") {
  if (!slideBgmSoundSelect) {
    return;
  }

  const soundIds = getAvailableSoundAssetNames("bgm");

  slideBgmSoundSelect.replaceChildren(new Option("None", ""));

  for (const id of soundIds) {
    slideBgmSoundSelect.add(new Option(id, id));
  }

  // Project JSONに存在するが
  // soundAssetsから消えている場合
  if (selectedSoundId && !soundIds.includes(selectedSoundId)) {
    slideBgmSoundSelect.add(
      new Option(`Missing: ${selectedSoundId}`, selectedSoundId),
    );
  }

  slideBgmSoundSelect.value = selectedSoundId ?? "";
};

const refreshSlideBgmOverrideControls = function () {
  const entries = getSlideInspectorTargetEntries();

  // =====================================
  // Targetなし
  // =====================================

  if (entries.length === 0) {
    slideBgmUseOverride.checked = false;

    slideBgmUseOverride.indeterminate = false;

    slideBgmEnabled.checked = false;

    refreshSlideBgmSoundOptions("");

    slideBgmVolume.value = "";
    if (slideBgmVolumeSlider) { slideBgmVolumeSlider.value = "0"; slideBgmVolumeSlider.disabled = true; }

    slideBgmLoop.checked = false;

    slideBgmEnabled.disabled = true;

    slideBgmSoundSelect.disabled = true;

    slideBgmVolume.disabled = true;
    if (slideBgmVolumeSlider) slideBgmVolumeSlider.disabled = true;

    slideBgmLoop.disabled = true;


    for (const control of [slideBgmFadeIn, slideBgmFadeOut, slideBgmContinueSame]) control.disabled = true;
    slideBgmClearButton.disabled = true;

    if (slideBgmEffectiveValue) {
      slideBgmEffectiveValue.textContent = "";
    }

    return;
  }

  // =====================================
  // Override状態
  // =====================================

  const slides = entries.map(({ slideState }) => slideState);

  const overrideStates = slides.map((slideState) =>
    hasSlideBgmOverride(slideState),
  );

  const allOverride = overrideStates.every(Boolean);

  const noneOverride = overrideStates.every((value) => !value);

  const mixedOverride = !allOverride && !noneOverride;

  // =====================================
  // checkbox
  // =====================================

  if (allOverride) {
    slideBgmUseOverride.checked = true;

    slideBgmUseOverride.indeterminate = false;
  } else if (noneOverride) {
    slideBgmUseOverride.checked = false;

    slideBgmUseOverride.indeterminate = false;
  } else {
    slideBgmUseOverride.checked = false;

    slideBgmUseOverride.indeterminate = true;
  }

  // =====================================
  // Current SlideのEffective値
  // =====================================

  const currentSlide = getCurrentSlideState();

  const effective = currentSlide
    ? resolveBgm(currentProjectData, currentSlide)
    : normalizeProjectBgm();

  slideBgmEnabled.checked = effective.enabled;

  refreshSlideBgmSoundOptions(effective.soundId);

  slideBgmVolume.value = String(effective.volume);
  if (slideBgmVolumeSlider) slideBgmVolumeSlider.value = String(effective.volume);

  slideBgmLoop.checked = effective.loop;
  const timing = resolveSceneBgmTiming(currentProjectData, currentSlide);
  slideBgmFadeIn.value = String(timing.fadeInSeconds);
  slideBgmFadeOut.value = String(timing.fadeOutSeconds);
  slideBgmContinueSame.checked = timing.continueSameTrack;

  // =====================================
  // Enable / Disable
  // =====================================

  const editable = allOverride;

  slideBgmEnabled.disabled = !editable;

  slideBgmSoundSelect.disabled = !editable;

  slideBgmVolume.disabled = !editable;
  if (slideBgmVolumeSlider) slideBgmVolumeSlider.disabled = !editable;

  slideBgmLoop.disabled = !editable;


  for (const control of [slideBgmFadeIn, slideBgmFadeOut, slideBgmContinueSame]) control.disabled = !editable || mixedOverride;
  slideBgmClearButton.disabled = noneOverride;

  // Mixedなら安全のため編集不可
  if (mixedOverride) {
    slideBgmEnabled.disabled = true;

    slideBgmSoundSelect.disabled = true;

    slideBgmVolume.disabled = true;

    slideBgmLoop.disabled = true;

  }

  // =====================================
  // Effective表示
  // =====================================

  if (slideBgmEffectiveValue) {
    slideBgmEffectiveValue.textContent = formatBgmSummary(effective);
  }
};

const getCurrentScenePresetForEditor = function () {
  if (!editingScenePresetName) {
    return null;
  }

  return currentProjectData?.scenePresets?.[editingScenePresetName] ?? null;
};

const refreshScenePresentationControls = () => {
  const preset = getCurrentScenePresetForEditor();
  const controls = [sceneTransitionPreset,sceneSoundPreset,sceneBgmFadeIn,sceneBgmFadeOut,sceneBgmContinueSame];
  for (const c of controls) if (c) c.disabled = !preset;
  sceneTransitionMode.disabled = !preset;
  sceneSoundMode.disabled = !preset;
  if (!preset) return;
  const settings = preset.presentation ?? {};
  const transitionOptions = Object.keys(currentProjectData.transitionPresets ?? {default:{}});
  const soundOptions = Object.keys(currentProjectData.soundPresets ?? {default:{}});
  setSelectOptions(sceneTransitionPreset,transitionOptions,settings.transitionPreset ?? "default");
  setSelectOptions(sceneSoundPreset,soundOptions,settings.soundPreset ?? "default");
  for (const [kind,modeControl,presetRow,details,fields] of [
    ["transition",sceneTransitionMode,sceneTransitionPresetRow,sceneTransitionCustomDetails,sceneCustomTransitionControls],
    ["sound",sceneSoundMode,sceneSoundPresetRow,sceneSoundCustomDetails,sceneCustomSoundControls]
  ]) {
    const custom = settings[`${kind}Mode`] === "custom";
    modeControl.value = custom ? "custom" : "preset";
    modeControl.disabled = false;
    presetRow.hidden = custom;
    details.hidden = !custom;
    if (custom) details.open = true;
    const defaultPreset = (kind === "transition" ? currentProjectData.transitionPresets : currentProjectData.soundPresets)?.[settings[`${kind}Preset`] ?? "default"] ?? {};
    if (kind === 'transition') {
      const mode = (settings.transitionCustom?.mode ?? defaultPreset.mode) === 'duration' ? 'duration' : 'speed';
      sceneCustomTransitionTimingMode.value = mode;
      sceneCustomTransitionTimingMode.disabled = !custom;
      sceneTransitionSpeedFields.hidden = mode === 'duration';
      sceneTransitionDurationFields.hidden = mode !== 'duration';
    }
    for (const [key,control] of Object.entries(fields)) {
      if (kind === "sound") {
        // Match the same library choices as Slide Sound Override.
        const source = multiNextSoundSelect;
        control.replaceChildren(...Array.from(source.options).map(option => option.cloneNode(true)));
        if (!control.options.length) for(const id of ["NONE","PREVIOUS","CURRENT","NEXT"]) control.add(new Option(id,id));
        const value = settings[`${kind}Custom`]?.[key] ?? defaultPreset[key] ?? "NONE";
        if (!Array.from(control.options).some(opt => opt.value === value)) control.add(new Option(value,value));
        control.value = value;
      } else control.value = String(settings[`${kind}Custom`]?.[key] ?? defaultPreset[key] ?? (key.endsWith('Duration') ? 2 : 1));
      control.disabled = !custom;
    }
  }

  const fallback = 1.5;
  const bgmSettings = normalizeScenePresetBgm(preset.bgm);
  sceneBgmFadeIn.value = String(bgmSettings.fadeInSeconds ?? settings.bgmFadeInSeconds ?? fallback);
  sceneBgmFadeOut.value = String(bgmSettings.fadeOutSeconds ?? settings.bgmFadeOutSeconds ?? fallback);
  sceneBgmContinueSame.checked = (bgmSettings.continueSameTrack ?? settings.continueSameTrack) !== false;
};
const commitScenePresentationSetting = (key,value) => {
  const preset = getCurrentScenePresetForEditor();
  if (!preset) return;
  const before = JSON.stringify(preset.presentation ?? {});
  const next = {...(preset.presentation ?? {}), [key]:value};
  if (JSON.stringify(next) === before) return;
  const edit = beginSettingsEdit();
  preset.presentation=next;
  finishSettingsEdit(edit);
  refreshScenePresentationControls();
};
for (const [control,key] of [[sceneTransitionPreset,"transitionPreset"],[sceneSoundPreset,"soundPreset"]]) {
  control?.addEventListener("change",()=>commitScenePresentationSetting(key,control.value));
}
const commitSceneBgmTiming = (key, value) => {
  const preset = getCurrentScenePresetForEditor();
  if (!preset) return;
  const current = normalizeScenePresetBgm(preset.bgm);
  const previous = resolveSceneBgmTiming(currentProjectData, {scenePreset: editingScenePresetName});
  const effectivePrevious = key === "fadeInSeconds" ? previous.fadeInSeconds
    : key === "fadeOutSeconds" ? previous.fadeOutSeconds : previous.continueSameTrack;
  if (Object.is(effectivePrevious, value)) return;
  const edit = beginSettingsEdit();
  preset.bgm = {...current, [key]: value};
  // Retire old Scene.presentation timing fields after an explicit edit.
  if (preset.presentation) {
    const oldKey = key === "fadeInSeconds" ? "bgmFadeInSeconds"
      : key === "fadeOutSeconds" ? "bgmFadeOutSeconds" : "continueSameTrack";
    delete preset.presentation[oldKey];
  }
  finishSettingsEdit(edit);
  refreshScenePresentationControls();
};
for (const [control,key] of [[sceneBgmFadeIn,"fadeInSeconds"],[sceneBgmFadeOut,"fadeOutSeconds"]]) {
  control?.addEventListener("change",()=>{
    const value=control.valueAsNumber;
    if (Number.isFinite(value) && value>=0 && value<=10) commitSceneBgmTiming(key,value);
    else refreshScenePresentationControls();
  });
}
sceneBgmContinueSame?.addEventListener("change",()=>commitSceneBgmTiming("continueSameTrack",sceneBgmContinueSame.checked));
for (const [control,kind] of [[sceneTransitionMode,"transition"],[sceneSoundMode,"sound"]]) {
  control.addEventListener("change",()=>commitScenePresentationSetting(`${kind}Mode`,control.value));
}
sceneCustomTransitionTimingMode?.addEventListener('change',()=>{
  const scene=getCurrentScenePresetForEditor(); if(!scene) return;
  const p=scene.presentation ?? {};
  commitScenePresentationSetting('transitionCustom',{...(p.transitionCustom ?? {}),mode:sceneCustomTransitionTimingMode.value});
});
for (const [kind,fields] of [["transition",sceneCustomTransitionControls],["sound",sceneCustomSoundControls]]) {
  for(const [key,control] of Object.entries(fields)) control.addEventListener("change",()=>{
    const scene=getCurrentScenePresetForEditor();
    if (!scene) return;
    const presentation=scene.presentation ?? {};
    let value=control.value;
    if (kind === "transition") {
      value=control.valueAsNumber;
      if(!Number.isFinite(value) || value<0 || value>(key.endsWith('Duration') ? 120 : 10)) {refreshScenePresentationControls();return;}
    }
    commitScenePresentationSetting(`${kind}Custom`,{...(presentation[`${kind}Custom`] ?? {}),[key]:value});
  });
}


const refreshScenePresetBgmControls = function () {
  if (scenePresetBgmFallbackNote) {
    scenePresetBgmFallbackNote.textContent = t("Scene BGM scene-only explanation");
  }
  refreshScenePresentationControls();
  const preset = getCurrentScenePresetForEditor();

  if (!preset) {
    scenePresetBgmUseOverride.checked = false;

    scenePresetBgmEnabled.disabled = true;

    scenePresetBgmSound.disabled = true;

    scenePresetBgmVolume.disabled = true;
    if (scenePresetBgmVolumeSlider) scenePresetBgmVolumeSlider.disabled = true;

    scenePresetBgmLoop.disabled = true;


    scenePresetBgmClearButton.disabled = true;

    return;
  }

  const override = normalizeScenePresetBgm(preset.bgm);

  const hasOverride = Object.keys(override).length > 0;

  const effective = resolveScenePresetBgm(currentProjectData, preset);

  scenePresetBgmUseOverride.checked = hasOverride;

  scenePresetBgmEnabled.checked = effective.enabled;

  // Sound options
  const soundIds = getAvailableSoundAssetNames("bgm");

  setSelectOptions(scenePresetBgmSound, effective.soundId && !soundIds.includes(effective.soundId) ? [...soundIds, effective.soundId] : soundIds, effective.soundId);

  scenePresetBgmVolume.value = String(effective.volume);
  if (scenePresetBgmVolumeSlider && document.activeElement !== scenePresetBgmVolumeSlider) scenePresetBgmVolumeSlider.value = String(effective.volume);

  scenePresetBgmLoop.checked = effective.loop;

  scenePresetBgmEnabled.disabled = false;

  scenePresetBgmSound.disabled = false;

  scenePresetBgmVolume.disabled = false;
  if (scenePresetBgmVolumeSlider) scenePresetBgmVolumeSlider.disabled = false;

  scenePresetBgmLoop.disabled = false;


  scenePresetBgmClearButton.disabled = !hasOverride;

  // Describe the actual track resolution, not a visually selected fallback
  // that could differ from the value used during presentation playback.
  scenePresetBgmEffective.textContent = formatBgmSummary(effective);
  if (hasOverride && override.enabled === true && !effective.soundId) {
    scenePresetBgmEffective.textContent +=
      document.documentElement.lang?.startsWith("ja")
        ? " ⚠ BGMの音声が未設定です。シーンBGMの音声を選択してください。"
        : " ⚠ No BGM track selected. Choose a Scene BGM track.";
  }
};

const enableScenePresetBgmOverride = function () {
  const preset = getCurrentScenePresetForEditor();

  if (!preset) {
    return false;
  }

  const projectBgm = normalizeProjectBgm();

  const settingsEdit = beginSettingsEdit();
  preset.bgm = {
    enabled: projectBgm.enabled,

    soundId: projectBgm.soundId,

    volume: projectBgm.volume,

    loop: projectBgm.loop,
  };

  refreshScenePresetBgmControls();
  finishSettingsEdit(settingsEdit);

  return true;
};

const commitScenePresetBgmField = function (field) {
  const preset = getCurrentScenePresetForEditor();
  if (!preset) return false;
  const original = normalizeScenePresetBgm(preset.bgm);
  const next = { ...original };
  if (field === "enabled") {
    next.enabled = scenePresetBgmEnabled.checked;
    if (next.enabled && !next.soundId) {
      const inheritedId = "";
      if (inheritedId) next.soundId = inheritedId;
    }
  }
  else if (field === "soundId") next.soundId = scenePresetBgmSound.value;
  else if (field === "loop") next.loop = scenePresetBgmLoop.checked;
  else if (field === "volume") {
    const volume = scenePresetBgmVolume.valueAsNumber;
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) return false;
    next.volume = volume;
  } else return false;
  const normalized = normalizeScenePresetBgm(next);
  if (JSON.stringify(original) === JSON.stringify(normalized)) return true;
  const settingsEdit = beginSettingsEdit();
  preset.bgm = normalized;
  finishSettingsEdit(settingsEdit);
  refreshScenePresetBgmControls();
  return true;
};

const clearScenePresetBgmOverride = function () {
  const preset = getCurrentScenePresetForEditor();

  if (!preset) {
    return false;
  }

  const settingsEdit = beginSettingsEdit();
  preset.bgm = {enabled: false};
  finishSettingsEdit(settingsEdit);

  refreshScenePresetBgmControls();

  return true;
};

const disposePresentationBgmFadingRuntime = function (runtime) {
  if (!runtime) {
    return;
  }

  presentationBgmFadingRuntimes.delete(runtime);

  disposePresentationBgmRuntime(runtime);
};

const disposeAllPresentationBgmFadingRuntimes = function () {
  for (const runtime of presentationBgmFadingRuntimes) {
    disposePresentationBgmRuntime(runtime);
  }

  presentationBgmFadingRuntimes.clear();
};

const fadePresentationBgmVolume = function (
  audio,
  fromVolume,
  toVolume,
  durationSeconds,
  generation,
) {
  return new Promise((resolve) => {
    if (!audio) {
      resolve(false);
      return;
    }

    const durationMs = Math.max(0, durationSeconds * 1000);

    if (durationMs <= 0) {
      audio.volume = Math.min(1, Math.max(0, toVolume));

      resolve(true);
      return;
    }

    const startedAt = performance.now();

    const step = function (now) {
      // 別のCrossfadeが開始された
      if (generation !== presentationBgmCrossfadeGeneration) {
        resolve(false);
        return;
      }

      const progress = Math.min(1, Math.max(0, (now - startedAt) / durationMs));

      const volume = fromVolume + (toVolume - fromVolume) * progress;

      audio.volume = Math.min(1, Math.max(0, volume));

      if (progress >= 1) {
        resolve(true);
        return;
      }

      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
};

const preparePresentationBgmForCrossfade = async function (
  requestedConfig,
  generation,
) {
  const session = presentationSession;

  if (!session?.active || !isPresentationMode()) {
    return null;
  }

  const config = normalizeProjectBgm(requestedConfig);

  if (!config.enabled || !config.soundId || config.soundId === "NONE") {
    return null;
  }

  const runtime = {
    session,

    config,

    sceneTiming: resolveSceneBgmTiming(currentProjectData, getCurrentSlideState()),
    scenePresetId: getCurrentSlideState()?.scenePreset ?? "default",

    audio: null,

    urls: new Set(),

    state: "loading",
  };

  try {
    const directoryHandle = currentProjectDirectoryHandle;

    const relativePath = resolveSoundAssetPath(config.soundId);

    if (!directoryHandle || !relativePath) {
      runtime.state = "error";

      showPresentationBgmNotice(
        "BGM の音源設定と Project フォルダーを確認してください。",
      );

      disposePresentationBgmRuntime(runtime);

      return null;
    }

    const url = await createProjectFileUrl(
      directoryHandle,
      relativePath,
      runtime.urls,
    );

    // 読み込み中に別のNavigationが発生した
    if (
      generation !== presentationBgmCrossfadeGeneration ||
      presentationSession !== session ||
      !isPresentationMode()
    ) {
      disposePresentationBgmRuntime(runtime);

      return null;
    }

    const audio = new Audio(url);

    runtime.audio = audio;

    audio.preload = "auto";

    // Crossfade専用なのでここだけ0
    //
    // startPresentationBgm() は変更しない
    audio.volume = 0;

    audio.loop = config.loop;

    audio.onended = () => {
      if (presentationBgmRuntime === runtime) {
        runtime.state = "ended";
      }
    };

    audio.onerror = () => {
      runtime.state = "error";

      if (presentationBgmRuntime === runtime) {
        showPresentationBgmNotice("BGM の音源を読み込めませんでした。");
      }
    };

    runtime.state = "ready";

    return runtime;
  } catch (error) {
    runtime.state = "error";

    disposePresentationBgmRuntime(runtime);

    console.warn("Crossfade BGM load failed:", error);

    return null;
  }
};

const crossfadePresentationBgm = async function (requestedConfig) {
  const oldRuntime = presentationBgmRuntime;

  // 古いBGMがないなら
  // Crossfadeする必要なし
  if (!oldRuntime?.audio) {
    return Boolean(await startPresentationBgm(requestedConfig));
  }

  // =====================================
  // 新しいCrossfade開始
  // =====================================

  presentationBgmCrossfadeGeneration++;

  const generation = presentationBgmCrossfadeGeneration;

  // 以前のCrossfadeでまだ消えきっていない
  // 古いBGMがあれば完全に停止
  disposeAllPresentationBgmFadingRuntimes();

  // =====================================
  // 新BGMを準備
  // =====================================

  const newRuntime = await preparePresentationBgmForCrossfade(
    requestedConfig,
    generation,
  );

  if (!newRuntime?.audio) {
    // 新BGM準備失敗なら
    // 今のBGMをそのまま維持
    return false;
  }

  // 準備中に別Navigation
  if (generation !== presentationBgmCrossfadeGeneration) {
    disposePresentationBgmRuntime(newRuntime);

    return false;
  }

  const oldAudio = oldRuntime.audio;

  const newAudio = newRuntime.audio;

  const oldStartVolume = oldAudio.volume;

  const newTargetVolume = requestedConfig.volume;

  // =====================================
  // 古いBGMをFade-out対象へ
  // =====================================

  presentationBgmFadingRuntimes.add(oldRuntime);

  // =====================================
  // 新BGMをCurrentへ
  //
  // playPreparedPresentationBgm() は
  // isCurrentPresentationBgm() を使うので
  // play前にCurrentへ設定する
  // =====================================

  presentationBgmRuntime = newRuntime;

  // =====================================
  // 新BGM再生開始
  // =====================================

  const played = await playPreparedPresentationBgm(newRuntime);

  if (!played) {
    // 新曲が再生できなかった場合は
    // 古いBGMへ戻す
    if (presentationBgmRuntime === newRuntime) {
      presentationBgmRuntime = oldRuntime;
    }

    presentationBgmFadingRuntimes.delete(oldRuntime);

    disposePresentationBgmRuntime(newRuntime);

    return false;
  }

  // =====================================
  // Crossfade
  // =====================================

  const fadeOutSeconds = oldRuntime.sceneTiming?.fadeOutSeconds ?? getPresentationBgmFadeSeconds();
  const fadeInSeconds = newRuntime.sceneTiming?.fadeInSeconds ?? getPresentationBgmFadeSeconds();

  const [oldFinished, newFinished] = await Promise.all([
    fadePresentationBgmVolume(
      oldAudio,
      oldStartVolume,
      0,
      fadeOutSeconds,
      generation,
    ),

    fadePresentationBgmVolume(
      newAudio,
      0,
      newTargetVolume,
      fadeInSeconds,
      generation,
    ),
  ]);

  // =====================================
  // 途中で別Navigationが発生
  // =====================================

  if (generation !== presentationBgmCrossfadeGeneration) {
    return false;
  }

  // =====================================
  // 新BGMを最終値へ
  // =====================================

  if (newFinished && newRuntime.audio) {
    newRuntime.audio.volume = newTargetVolume;
  }

  // =====================================
  // 古いBGM破棄
  // =====================================

  if (oldFinished) {
    disposePresentationBgmFadingRuntime(oldRuntime);
  }

  return true;
};

const fadeInPresentationBgm = async function (requestedConfig) {
  const config = normalizeProjectBgm(requestedConfig);

  if (!config.enabled || !config.soundId || config.soundId === "NONE") {
    return false;
  }

  // =====================================
  // Fade開始
  // =====================================

  presentationBgmCrossfadeGeneration++;

  const generation = presentationBgmCrossfadeGeneration;

  // =====================================
  // 古いFade-out中Runtimeがあれば破棄
  // =====================================

  disposeAllPresentationBgmFadingRuntimes();

  // =====================================
  // Crossfade用の準備関数を再利用
  //
  // 音量0で準備される
  // =====================================

  const runtime = await preparePresentationBgmForCrossfade(config, generation);

  if (!runtime?.audio) {
    return false;
  }

  // =====================================
  // 読込中に別Navigation
  // =====================================

  if (generation !== presentationBgmCrossfadeGeneration) {
    disposePresentationBgmRuntime(runtime);

    return false;
  }

  // =====================================
  // Current Runtimeへ
  // =====================================

  presentationBgmRuntime = runtime;

  // =====================================
  // 再生開始
  //
  // この時点では volume = 0
  // =====================================

  const played = await playPreparedPresentationBgm(runtime);

  if (!played) {
    if (presentationBgmRuntime === runtime) {
      presentationBgmRuntime = null;
    }

    disposePresentationBgmRuntime(runtime);

    return false;
  }

  // =====================================
  // Fade-in
  // =====================================

  const fadeSeconds = runtime.sceneTiming?.fadeInSeconds ?? getPresentationBgmFadeSeconds();

  const finished = await fadePresentationBgmVolume(
    runtime.audio,
    0,
    config.volume,
    fadeSeconds,
    generation,
  );

  // =====================================
  // 別Navigationでキャンセル
  // =====================================

  if (generation !== presentationBgmCrossfadeGeneration) {
    return false;
  }

  // =====================================
  // 最終音量保証
  // =====================================

  if (finished && runtime.audio) {
    runtime.audio.volume = config.volume;
  }

  return true;
};

const fadeOutPresentationBgm = async function () {
  const runtime = presentationBgmRuntime;

  if (!runtime?.audio) {
    return true;
  }

  // =====================================
  // Fade開始
  // =====================================

  presentationBgmCrossfadeGeneration++;

  const generation = presentationBgmCrossfadeGeneration;

  // =====================================
  // 過去のFade Runtimeを掃除
  // =====================================

  disposeAllPresentationBgmFadingRuntimes();

  const audio = runtime.audio;

  const startVolume = audio.volume;

  // =====================================
  // Fade-out
  // =====================================

  const fadeSeconds = runtime.sceneTiming?.fadeOutSeconds ?? getPresentationBgmFadeSeconds();

  const finished = await fadePresentationBgmVolume(
    audio,
    startVolume,
    0,
    fadeSeconds,
    generation,
  );

  // =====================================
  // 途中で別Navigation
  // =====================================

  if (generation !== presentationBgmCrossfadeGeneration) {
    return false;
  }

  // =====================================
  // Runtimeがまだ同じなら破棄
  // =====================================

  if (presentationBgmRuntime === runtime) {
    presentationBgmRuntime = null;
  }

  disposePresentationBgmRuntime(runtime);

  return finished;
};

const getPresentationBgmFadeSeconds = function () {
  return 1.5; // Default only; effective Scene/Slide timing lives in runtime.sceneTiming.
};

const getPresentationAutoPlayBaseIntervalSeconds = function () {
  const value = Number(presentationSettings?.autoPlayIntervalSeconds);

  if (Number.isFinite(value) && value > 0) {
    return value;
  }

  return 5;
};

const resolveSlideAutoPlayIntervalSeconds = function (slideState) {
  const baseInterval = getPresentationAutoPlayBaseIntervalSeconds();

  if (!slideState) {
    return baseInterval;
  }

  const override = normalizeSlideAutoPlayOverride(slideState.autoPlayOverride);

  if (typeof override.intervalSeconds === "number") {
    return override.intervalSeconds;
  }

  return baseInterval;
};

const resolveCurrentSlideAutoPlayIntervalSeconds = function () {
  return resolveSlideAutoPlayIntervalSeconds(getCurrentSlideState());
};

const refreshSlideAutoPlayControls = function () {
  const targets = getSlideInspectorTargetSlides();

  if (!Array.isArray(targets) || targets.length === 0) {
    slideAutoPlayUseOverride.checked = false;

    slideAutoPlayUseOverride.indeterminate = false;

    slideAutoPlayInterval.disabled = true;

    slideAutoPlayClearButton.disabled = true;

    slideAutoPlayEffectiveValue.textContent = "";

    return;
  }

  const overrideFlags = targets.map(hasSlideAutoPlayOverride);

  const allOverride = overrideFlags.every(Boolean);

  const noneOverride = overrideFlags.every((value) => !value);

  if (allOverride) {
    slideAutoPlayUseOverride.checked = true;

    slideAutoPlayUseOverride.indeterminate = false;
  } else if (noneOverride) {
    slideAutoPlayUseOverride.checked = false;

    slideAutoPlayUseOverride.indeterminate = false;
  } else {
    slideAutoPlayUseOverride.checked = false;

    slideAutoPlayUseOverride.indeterminate = true;
  }

  // =====================================
  // 表示するInterval
  // =====================================

  const effectiveValues = targets.map(resolveSlideAutoPlayIntervalSeconds);

  const firstValue = effectiveValues[0];

  const sameEffective = effectiveValues.every(
    (value) => Math.abs(value - firstValue) < 0.0001,
  );

  if (sameEffective) {
    slideAutoPlayInterval.value = String(firstValue);

    slideAutoPlayEffectiveValue.textContent = `Effective: ${firstValue} sec`;
  } else {
    slideAutoPlayInterval.value = "";

    slideAutoPlayEffectiveValue.textContent = "Effective: Mixed";
  }

  const enabled = allOverride;

  slideAutoPlayInterval.disabled = !enabled;

  slideAutoPlayClearButton.disabled = noneOverride;
};

const enableAutoPlayOverrideForInspectorTargets = function () {
  const targets = getSlideInspectorTargetSlides();

  if (!Array.isArray(targets) || targets.length === 0) {
    return false;
  }

  const changes = [];

  for (const slideState of targets) {
    const before = slideState.autoPlayOverride?.intervalSeconds;

    const effective = resolveSlideAutoPlayIntervalSeconds(slideState);

    if (before === effective) {
      continue;
    }

    slideState.autoPlayOverride = normalizeSlideAutoPlayOverride(
      slideState.autoPlayOverride,
    );

    slideState.autoPlayOverride.intervalSeconds = effective;

    changes.push({
      slideId: slideState.id,

      group: "autoplay",

      propertyName: "intervalSeconds",

      before,

      after: effective,
    });
  }

  if (changes.length > 0) {
    pushEditorHistory({
      type: "slide-multi-property-batch",

      changes,
    });
  }

  refreshSlideSettingsInspector();

  return true;
};

const applyAutoPlayOverrideToInspectorTargets = function () {
  const targets = getSlideInspectorTargetSlides();

  if (!Array.isArray(targets) || targets.length === 0) {
    return false;
  }

  const raw = slideAutoPlayInterval.value.trim();

  if (raw === "") {
    return false;
  }

  const rawValue = Number(raw);

  if (!Number.isFinite(rawValue)) {
    return false;
  }

  // Reject invalid values rather than silently clamping during input commit.
  if (rawValue < 0.1 || rawValue > 3600) {
    return false;
  }

  const intervalSeconds = rawValue;

  const changes = [];

  for (const slideState of targets) {
    slideState.autoPlayOverride = normalizeSlideAutoPlayOverride(
      slideState.autoPlayOverride,
    );

    const before = slideState.autoPlayOverride.intervalSeconds;

    if (before === intervalSeconds) {
      continue;
    }

    slideState.autoPlayOverride.intervalSeconds = intervalSeconds;

    changes.push({
      slideId: slideState.id,

      group: "autoplay",

      propertyName: "intervalSeconds",

      before,

      after: intervalSeconds,
    });
  }

  if (changes.length > 0) {
    pushEditorHistory({
      type: "slide-multi-property-batch",

      changes,
    });
  }

  refreshSlideSettingsInspector();

  return true;
};

const clearAutoPlayOverrideFromInspectorTargets = function () {
  const targets = getSlideInspectorTargetSlides();

  if (!Array.isArray(targets) || targets.length === 0) {
    return false;
  }

  const changes = [];

  for (const slideState of targets) {
    const before = slideState.autoPlayOverride?.intervalSeconds;

    if (before === undefined) {
      continue;
    }

    delete slideState.autoPlayOverride.intervalSeconds;

    changes.push({
      slideId: slideState.id,

      group: "autoplay",

      propertyName: "intervalSeconds",

      before,

      after: undefined,
    });
  }

  if (changes.length > 0) {
    pushEditorHistory({
      type: "slide-multi-property-batch",

      changes,
    });
  }

  refreshSlideSettingsInspector();

  return true;
};

const cleanupPresentationRuntime = function () {
  // =====================================
  // AutoPlay
  // =====================================

  pausePresentationAutoPlay();

  presentationAutoPlayWasRunningBeforeOverview = false;

  // =====================================
  // BGM
  // =====================================

  stopPresentationBgm();

  // =====================================
  // Overview
  // =====================================

  closePresentationOverview?.();

  // =====================================
  // Presentation HUD / Overlay
  // =====================================

  presentationOverlay.hidden = true;

  stopPresentationHudTimer();

  resetPresentationHudIdleState();

  // =====================================
  // Control state
  // =====================================

  refreshPresentationControls?.();
};

const { hideAppNotice, showAppNotice } = createAppNotice({
  appNotice,
  appNoticeMessage,
});

const refreshCurrentSlideState = function () {
  refreshSlideNavigationIndicator();

  refreshSlideSettingsInspector();

  refreshToolbarCurrentSlideStatus();

  switchAction();
};

const finishPresentationNavigation = function (
  direction,
  { refreshUi = false } = {},
) {
  if (!isPresentationMode() || !presentationSession?.active) {
    return;
  }

  // =====================================
  // Session
  // =====================================

  recordPresentationNavigation(direction);

  // =====================================
  // Presentation UI
  // =====================================

  if (refreshUi) {
    refreshPresentationHud();

    refreshPresentationControls();

    showPresentationHudTemporarily({ slideChange: true });
  }

  // =====================================
  // AutoPlay
  // =====================================

  reschedulePresentationAutoPlay();
};

// コピペ
const copySlides = function () {
  const entries = getSlideOperationTargetEntries();

  if (entries.length === 0) {
    return false;
  }

  copiedSlideSnapshots = entries
    .map(({ slideState }) => createSlideClipboardSnapshot(slideState))
    .filter(Boolean);

  refreshSlideClipboardUi();

  return copiedSlideSnapshots.length > 0;
};

const pasteCopiedSlides = async function ({inPlace = false} = {}) {
  if (copiedSlideSnapshots.length === 0) {
    return false;
  }

  const targetEntries = getSlideOperationTargetEntries();

  const selectionBefore = [...selectedSlideIds];

  const currentSlideIdBefore = getCurrentSlideState()?.id ?? null;

  const insertIndex =
    targetEntries.length > 0
      ? targetEntries[targetEntries.length - 1].index + 1
      : slideStates.length;

  const historySlides = [];
  const pastedIds = [];

  let nextInsertIndex = insertIndex;

  for (const snapshot of copiedSlideSnapshots) {
    const newSlide = createSlideStateFromClipboard(snapshot, createUniqueSlideId);

    if (!newSlide) {
      continue;
    }

    if (!inPlace) avoidSlidePositionOverlap(newSlide);
    slideStates.splice(nextInsertIndex, 0, newSlide);

    const restored = await restoreSlideMeshToScene(newSlide);

    if (!restored) {
      slideStates.splice(nextInsertIndex, 1);

      continue;
    }

    historySlides.push({
      index: nextInsertIndex,
      snapshot: createSlideHistorySnapshot(newSlide),
    });

    pastedIds.push(newSlide.id);

    nextInsertIndex++;
  }

  if (pastedIds.length === 0) {
    return false;
  }

  slideCount = slideStates.length;

  // PasteされたSlide群を新しいSelectionにする
  selectedSlideIds.clear();

  for (const id of pastedIds) {
    selectedSlideIds.add(id);
  }

  // Keep the previous Current while selecting the newly pasted Slides.
  const lastPastedId = pastedIds[pastedIds.length - 1];
  const preservedCurrentId = preserveCurrentAfterInsertion(currentSlideIdBefore, slideStates);
  currentSlideIndex = slideStates.findIndex(slide => slide.id === preservedCurrentId);
  if (currentSlideIndex < 0 && slideStates.length) currentSlideIndex = 0;
  slideSelectionAnchorIndex = slideStates.findIndex(slide => slide.id === lastPastedId);

  pushEditorHistory({
    type: "slide-presence-batch",
    operation: "paste",
    slides: historySlides,

    selectionBefore,
    selectionAfter: [...pastedIds],

    currentSlideIdBefore,
    currentSlideIdAfter: preservedCurrentId,
  });

  await refreshAfterSlideReorderBatch();

  return true;
};

const refreshSlideClipboardUi = function () {
  pasteSlideButton.disabled = copiedSlideSnapshots.length === 0;
};

const scrollCurrentSlideThumbnailIntoView = function () {
  if (draggingSlideIndex !== null) {
    return;
  }

  if (!thumbnailContainer) {
    return;
  }

  const current = thumbnailContainer.querySelector(
    ".slide-thumbnail-item.current",
  );

  if (!current) {
    return;
  }

  const containerRect = thumbnailContainer.getBoundingClientRect();

  const itemRect = current.getBoundingClientRect();

  const target =
    thumbnailContainer.scrollLeft +
    (itemRect.left - containerRect.left) -
    (containerRect.width - itemRect.width) / 2;

  thumbnailContainer.scrollTo({
    left: Math.max(0, target),

    behavior: "smooth",
  });
};

// 右クリックメニューのDOM制御は専用モジュールに委譲する。
// 操作可否の判定は、アプリケーションの選択状態を持つmain.jsが担当する。
const slideContextMenuController = createSlideContextMenuController({
  menu: slideContextMenu,
  isValidSlideIndex: (index) =>
    Number.isInteger(index) && index >= 0 && index < slideStates.length,
  getCommandDisabled: (index) => {
    const hasSlide = Number.isInteger(index) && index >= 0 && index < slideStates.length;
    return {
      "set-current": !hasSlide,
      "copy": !hasSlide,
      "paste-after": copiedSlideSnapshots.length === 0,
      "duplicate": !hasSlide,
      "move-left": !hasSlide || !canMoveSlideTargetsLeft(),
      "move-right": !hasSlide || !canMoveSlideTargetsRight(),
      "place-camera": !hasSlide,
      "delete": !hasSlide,
      "gather-selected": selectedSlideIds.size < 2 || areSelectedSlidesContiguous(),
      "move-selected-to-start": selectedSlideIds.size === 0 || areSelectedSlidesAtStart(),
      "move-selected-to-end": selectedSlideIds.size === 0 || areSelectedSlidesAtEnd(),
    };
  },
});

const closeSlideContextMenu = () => slideContextMenuController.close();
const openSlideContextMenu = (clientX, clientY, slideIndex) =>
  slideContextMenuController.open(clientX, clientY, slideIndex);

// Panel
const editorLayout = createEditorLayout({
  projectPanelResizer,
  slidePanelResizer,
  projectPanelCollapseButton,
  slidePanelCollapseButton,
});

const { loadEditorLayoutSettings, normalizeEditorPanelWidths } = editorLayout;

const getProjectEditorDisplayName = function () {
  const name = currentProjectData?.name;

  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }

  return "Untitled Project";
};

const getEditingScenePresetName = function () {
  if (
    editingScenePresetName &&
    currentProjectData?.scenePresets?.[editingScenePresetName]
  ) {
    return editingScenePresetName;
  }

  return "default";
};

const refreshProjectPanelContext = function () {
  const hasProject =
    currentProjectData && typeof currentProjectData === "object";

  const projectName = hasProject ? getProjectEditorDisplayName() : "No Project";

  const editingPresetName = hasProject ? getEditingScenePresetName() : "—";

  if (projectPanelProjectName) {
    projectPanelProjectName.textContent = projectName;
  }

  if (projectPanelEditingPreset) {
    projectPanelEditingPreset.textContent = hasProject
      ? `Scene Preset: ${editingPresetName}`
      : "Scene Preset: —";
  }

  if (projectContextProjectName) {
    projectContextProjectName.textContent = projectName;
  }

  if (projectContextEditingPreset) {
    projectContextEditingPreset.textContent = editingPresetName;
  }
};

// 時計
////////////////////
////////////////////////////////////////
// 日時を表示する関数
const displayCurrentTime = function () {
  // 現在の日時を取得
  const now = new Date();

  // 年、月、日、曜日、時、分、秒を取得
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth()は0から始まるため+1する
  const date = now.getDate();
  const day = ["日", "月", "火", "水", "木", "金", "土"][now.getDay()];
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");

  // 表示形式を整形
  const formattedTime = `${year}年${month}月${date}日(${day}) ${hours}:${minutes}:${seconds}`;

  // HTML要素に表示
  document.getElementById("datetime").textContent = formattedTime;
};

// WebGL
////////////////////
////////////////////////////////////////
// ライト
const genLights = function (scene) {
  const hLightX = new HemisphericLight("light", new Vector3(-1, 1, 0), scene);
  hLightX.intensity = 0.7;
  const hLightZ = new HemisphericLight("light", new Vector3(0, 1, -1), scene);
  hLightZ.intensity = 0.7;
  const hLightX2 = new HemisphericLight("light", new Vector3(1, 1, 0), scene);
  hLightX2.intensity = 0.7;
  const hLightZ2 = new HemisphericLight("light", new Vector3(0, 1, 1), scene);
  hLightZ2.intensity = 0.7;
  // const pLight = new PointLight("pLight", new Vector3(0, 10, 15), scene);
  // plight.intensity = 8;
  // const dlight = new DirectionalLight("DirectionalLight", new Vector3(0, -1, 0), scene);
  // dlight.intensity = 12;
};

// カメラ生成
const genCamera = function (targetScene) {
  const newCamera = new UniversalCamera(
    "Camera",
    new Vector3(cameraInitX, cameraInitY, cameraInitZ),
    targetScene,
  );

  // Quaternionをカメラ姿勢の正本にする
  newCamera.rotationQuaternion = Quaternion.Identity();

  newCamera.minZ = 0.03;
  installCameraFramingOffset(newCamera, () => currentProjectData?.cameraFramingOffset);

  // UniversalCamera標準移動は
  // 今回は既存の独自操作を使うので速度0でもOK
  newCamera.speed = 0;

  targetScene.activeCamera = newCamera;

  return newCamera;
};

// Camera状態初期化用
const initializeCameraState = function () {
  const initialPosition = new Vector3(cameraInitX, cameraInitY, cameraInitZ);
  const initialTarget = new Vector3(targetInitX, targetInitY, targetInitZ);
  const initialUp = new Vector3(upInitX, upInitY, upInitZ);
  cameraCurrentPosition = initialPosition.clone();
  cameraEndPointPosition = initialPosition.clone();

  const initialRotation = Quaternion.FromRotationMatrix(
    Matrix.LookAtLH(initialPosition, initialTarget, initialUp).invert(),
  ).normalize();
  cameraCurrentRotation = initialRotation.clone();
  cameraEndPointRotation = initialRotation.clone();

  if (camera) {
    camera.position.copyFrom(cameraCurrentPosition);
    camera.rotationQuaternion = cameraCurrentRotation.clone();
  }
};

// カメラ移動用の設定をする
const setCameraTransitionTarget = function () {
  if (
    !slideStates ||
    slideStates.length === 0 ||
    currentSlideIndex < 0 ||
    currentSlideIndex >= slideStates.length
  ) {
    return;
  }

  const slide = slideStates[currentSlideIndex];

  // Capture both endpoints once: Duration mode must finish at the requested time.
  transitionElapsed = 0;
  transitionStartPosition = cameraCurrentPosition.clone();
  transitionStartRotation = cameraCurrentRotation.clone();
  cameraEndPointPosition = slide.cameraPosition.clone();

  cameraEndPointRotation = slide.cameraRotation.clone();

  cameraControlViaKeyboard = true;
};

// 空などの生成
const createEnvironment = function (targetScene) {
  // =====================================
  // Sky Mesh
  // =====================================

  const skyMesh = MeshBuilder.CreateBox(
    "environment-sky",
    {
      size: 1000,
    },
    targetScene,
  );

  skyMesh.infiniteDistance = true;

  // =====================================
  // Procedural Sky Material
  // =====================================

  const skyMaterial = new SkyMaterial("environment-sky-material", targetScene);

  skyMaterial.backFaceCulling = false;

  skyMaterial.luminance = 1;

  skyMesh.material = skyMaterial;

  // =====================================
  // Fog
  // =====================================

  targetScene.fogMode = Scene.FOGMODE_EXP;

  // =====================================
  // Controller
  // =====================================

  return {
    skyMesh: skyMesh,

    proceduralSkyMaterial: skyMaterial,

    skyboxMaterial: null,

    skyboxTexture: null,

    skyboxKey: null,

    // 非同期Environment適用要求の世代
    applyGeneration: 0,

    // 最後に適用したSkyboxのObject URL
    skyboxUrls: [],
  };
};

const applyEnvironment = async function (targetScene, environment, controller) {
  if (!targetScene || !environment || !controller) {
    return false;
  }

  // =====================================
  // 今回の適用要求を識別
  // =====================================

  const generation = ++controller.applyGeneration;

  const targetProject = currentProjectData;
  const targetDirectory = currentProjectDirectoryHandle;
  const targetUrlSet = activeProjectObjectUrls;

  const isCurrentRequest = () =>
    controller.applyGeneration === generation &&
    scene === targetScene &&
    activeEnvironmentController === controller &&
    currentProjectData === targetProject &&
    currentProjectDirectoryHandle === targetDirectory &&
    activeProjectObjectUrls === targetUrlSet;

  // =====================================
  // Sky
  // =====================================

  if (environment.useSkybox) {
    const loaded = await loadSkybox(
      targetScene,
      environment,
      controller,
      generation,
    );

    // 古い要求ならSkyやFogを変更しない
    if (!isCurrentRequest()) {
      return false;
    }

    if (loaded && controller.skyboxMaterial) {
      controller.skyMesh.material = controller.skyboxMaterial;
    } else {
      // 読み込み失敗時はProcedural Skyへ
      controller.skyMesh.material = controller.proceduralSkyMaterial;
    }
  } else {
    const skyMaterial = controller.proceduralSkyMaterial;

    skyMaterial.turbidity = Number(environment.turbidity ?? 10);

    skyMaterial.inclination = Number(environment.inclination ?? 0);

    skyMaterial.azimuth = Number(environment.azimuth ?? 0.5);

    controller.skyMesh.material = skyMaterial;
  }

  // =====================================
  // Fog
  // =====================================

  const fogColorArray = Array.isArray(environment.fogColor)
    ? environment.fogColor
    : [0.75, 0.75, 0.75];

  targetScene.fogColor = new Color3(
    Number(fogColorArray[0] ?? 0.75),
    Number(fogColorArray[1] ?? 0.75),
    Number(fogColorArray[2] ?? 0.75),
  );

  targetScene.fogDensity = Number(environment.fogDensity ?? 0.002);

  targetScene.fogMode = Scene.FOGMODE_EXP;

  return true;
};

const getResolvedEditorEnvironment = function () {
  if (!currentProjectData) {
    currentProjectData = createDefaultProjectData();
  }

  // Slideあり
  if (currentSlideIndex >= 0 && currentSlideIndex < slideStates.length) {
    return resolveEnvironment(
      currentProjectData,
      slideStates[currentSlideIndex],
    );
  }

  // Slideなし
  // default preset Environment
  return {
    ...(currentProjectData.scenePresets?.default?.environment ?? {}),
  };
};

const applyCurrentEnvironment = async function () {
  if (!scene || !activeEnvironmentController) {
    return;
  }

  const targetScene = scene;
  const targetController = activeEnvironmentController;
  const targetProject = currentProjectData;
  const targetDirectory = currentProjectDirectoryHandle;

  const environment = getResolvedEditorEnvironment();

  const applied = await applyEnvironment(
    targetScene,
    environment,
    targetController,
  );

  // 古い要求ならUIを更新しない
  if (
    !applied ||
    scene !== targetScene ||
    activeEnvironmentController !== targetController ||
    currentProjectData !== targetProject ||
    currentProjectDirectoryHandle !== targetDirectory
  ) {
    return;
  }

  // Sync from the *editor target*, not from the effective rendered Slide
  // environment. They differ whenever the Slide overrides the Scene preset.
  syncEnvironmentUi(getEnvironmentForEditorDisplay());
};

const loadSkybox = async function (
  targetScene,
  environment,
  controller,
  generation,
) {
  const config = environment.skybox;

  if (!config) {
    console.warn("useSkybox=true but no skybox config was found.");
    return false;
  }

  const key = getSkyboxConfigKey(config);

  // =====================================
  // ロード開始時のContextを保持
  // =====================================

  const targetProject = currentProjectData;
  const targetDirectory = currentProjectDirectoryHandle;
  const targetUrlSet = activeProjectObjectUrls;

  const isCurrentRequest = () =>
    controller.applyGeneration === generation &&
    scene === targetScene &&
    activeEnvironmentController === controller &&
    currentProjectData === targetProject &&
    currentProjectDirectoryHandle === targetDirectory &&
    activeProjectObjectUrls === targetUrlSet;

  // 同じSkyboxなら再ロードしない
  if (controller.skyboxKey === key && controller.skyboxTexture) {
    return isCurrentRequest();
  }

  let urls = [];
  let cubeTexture = null;
  let newMaterial = null;

  try {
    // =====================================
    // 6面のURLを生成
    // =====================================

    urls = await createSkyboxUrls(targetDirectory, config, targetUrlSet);

    // =====================================
    // 非同期処理後の有効性確認
    // =====================================

    if (!isCurrentRequest()) {
      for (const url of urls) {
        revokeOwnedObjectUrl(targetUrlSet, url);
      }

      return false;
    }

    // =====================================
    // 新Textureの生成
    // =====================================

    cubeTexture = CubeTexture.CreateFromImages(urls, targetScene);

    cubeTexture.coordinatesMode = Texture.SKYBOX_MODE;

    // 既存Materialがあれば再利用
    const material =
      controller.skyboxMaterial ??
      new StandardMaterial("environment-skybox-material", targetScene);

    if (!controller.skyboxMaterial) {
      newMaterial = material;
    }

    material.backFaceCulling = false;
    material.disableLighting = true;
    material.reflectionTexture = cubeTexture;
    material.diffuseColor = new Color3(0, 0, 0);
    material.specularColor = new Color3(0, 0, 0);

    // =====================================
    // 旧Skyboxの参照を退避
    // =====================================

    const oldSkyboxTexture = controller.skyboxTexture ?? null;

    const oldSkyboxUrls = Array.isArray(controller.skyboxUrls)
      ? [...controller.skyboxUrls]
      : [];

    // =====================================
    // 新Skyboxを採用
    // =====================================

    controller.skyboxMaterial = material;
    controller.skyboxTexture = cubeTexture;
    controller.skyboxUrls = [...urls];
    controller.skyboxKey = key;

    // 採用したのでエラー処理では破棄しない
    cubeTexture = null;
    newMaterial = null;
    urls = [];

    // =====================================
    // 旧Skyboxを破棄
    // =====================================

    if (oldSkyboxTexture && oldSkyboxTexture !== controller.skyboxTexture) {
      oldSkyboxTexture.dispose();
    }

    for (const oldUrl of oldSkyboxUrls) {
      revokeOwnedObjectUrl(targetUrlSet, oldUrl);
    }

    return true;
  } catch (error) {
    // =====================================
    // 採用前の生成物を破棄
    // =====================================

    cubeTexture?.dispose();
    newMaterial?.dispose();

    for (const url of urls) {
      revokeOwnedObjectUrl(targetUrlSet, url);
    }

    // 古い要求の失敗は現在のUIへ通知しない
    if (!isCurrentRequest()) {
      return false;
    }

    console.warn("Skybox load failed:", { config }, error);

    showAppNotice(
      "Skyboxを読み込めませんでした。画像ファイルを確認してください。",
      {
        level: "warning",
        key: `load-skybox:${key}`,
      },
    );

    return false;
  }
};

// Asset
const loadImportedSceneAsset = async function (
  targetScene,
  assetConfig,
  objectUrls,
  directoryHandle,
  { type, pluginExtension },
) {
  const assetUrl = await createProjectFileUrl(
    directoryHandle,
    assetConfig.src,
    objectUrls,
  );

  const result = await ImportMeshAsync(assetUrl, targetScene, {
    pluginExtension,
  });

  let assetRoot = null;

  try {
    // =====================================
    // Editor用Asset Root
    // =====================================

    assetRoot = new TransformNode("asset-root-" + assetConfig.id, targetScene);

    // =====================================
    // Importされた最上位Nodeを
    // assetRootの子にする
    // =====================================

    for (const mesh of result.meshes) {
      if (mesh && !mesh.parent) {
        mesh.parent = assetRoot;
      }
    }

    // =====================================
    // ProjectのTransformは
    // assetRootへ適用
    // =====================================

    applyAssetTransform(assetRoot, assetConfig);

    return {
      config: assetConfig,

      type,

      result,

      meshes: result.meshes,

      rootNode: assetRoot,
    };
  } catch (error) {
    // 生成途中のRootを破棄
    assetRoot?.dispose(false, true);

    // インポート済みNodeの後始末
    for (const mesh of result.meshes ?? []) {
      if (mesh && !mesh.isDisposed()) {
        mesh.dispose(false, true);
      }
    }
    throw error;
  }
};

const loadGlbAsset = async function (
  targetScene,
  assetConfig,
  objectUrls,
  directoryHandle,
) {
  return await loadImportedSceneAsset(
    targetScene,
    assetConfig,
    objectUrls,
    directoryHandle,
    {
      type: "glb",
      pluginExtension: ".glb",
    },
  );
};

const loadSpzAsset = async function (
  targetScene,
  assetConfig,
  objectUrls,
  directoryHandle,
) {
  return await loadImportedSceneAsset(
    targetScene,
    assetConfig,
    objectUrls,
    directoryHandle,
    {
      type: "spz",
      pluginExtension: ".spz",
    },
  );
};

const loadSceneAsset = async function (
  targetScene,
  assetConfig,
  objectUrls,
  directoryHandle,
) {
  const type = String(assetConfig?.type ?? "").toLowerCase();

  switch (type) {
    case "glb":
      return await loadGlbAsset(
        targetScene,
        assetConfig,
        objectUrls,
        directoryHandle,
      );

    case "spz":
      return await loadSpzAsset(
        targetScene,
        assetConfig,
        objectUrls,
        directoryHandle,
      );

    default:
      console.warn("Unsupported asset type:", type, assetConfig);
      return null;
  }
};

const loadAndConfigureSceneAsset = async function (
  targetScene,
  assetConfig,
  objectUrls,
  glowLayer,
  directoryHandle,
) {
  const loadedAsset = await loadSceneAsset(
    targetScene,
    assetConfig,
    objectUrls,
    directoryHandle,
  );

  if (!loadedAsset) {
    throw new Error(
      `Scene asset could not be loaded: ${assetConfig?.src ?? "(unknown)"}`,
    );
  }

  // このAssetを管理するGlowLayerを記録
  loadedAsset.ownerGlowLayer = glowLayer;

  configureAssetGlow(loadedAsset, glowLayer);

  return loadedAsset;
};

const loadScenePresetAssets = async function (
  targetScene,
  presetName,
  assetConfigs,
  objectUrls,
  glowLayer,
  directoryHandle,
) {
  const loadedAssets = [];
  const failedAssets = [];

  for (const assetConfig of assetConfigs) {
    try {
      const loaded = await loadSceneAsset(
        targetScene,
        assetConfig,
        objectUrls,
        directoryHandle,
      );

      if (!loaded) {
        console.warn("Scene asset was not loaded:", {
          presetName,
          assetId: assetConfig?.id,
          src: assetConfig?.src,
          type: assetConfig?.type,
        });

        failedAssets.push({
          config: assetConfig,
          error: null,
        });

        continue;
      }

      loaded.ownerGlowLayer = glowLayer;

      configureAssetGlow(loaded, glowLayer);

      loadedAssets.push(loaded);
    } catch (error) {
      console.warn(
        "Scene asset load failed:",
        {
          presetName,
          assetId: assetConfig?.id,
          src: assetConfig?.src,
          type: assetConfig?.type,
        },
        error,
      );

      failedAssets.push({
        config: assetConfig,
        error,
      });

      showAppNotice(
        `Scene Asset "${assetConfig?.id ?? "unknown"}" を読み込めませんでした。`,
        {
          level: "warning",
          key: `asset-load:${assetConfig.id}`,
        },
      );
    }
  }

  return {
    presetName,
    assets: loadedAssets,
    failedAssets,
  };
};

const disposeScenePresetLoadResult = function (cachedPreset) {
  if (!cachedPreset) return;

  for (const loadedAsset of cachedPreset.assets ?? []) {
    disposeLoadedSceneAsset(loadedAsset);
  }

  cachedPreset.assets = [];
};

const resetScenePresetRuntime = function () {
  // 実行中の古い切替要求を無効化
  scenePresetActivationGeneration++;

  sceneAssetRuntimeGeneration++;
  sceneAssetLoadPromises.clear();

  scenePresetAssetCache.clear();
  scenePresetLoadPromises.clear();
  scene2fClearAssetSelection();

  activeScenePresetName = null;
  // All-scenes preview is transient to the current project; new projects start normally.
  scenePreviewUi.allScenes = false;
  if (showAllScenesCheckbox) showAllScenesCheckbox.checked = false;
};

const hideAllScenePresetAssets = function () {
  if (scenePreviewUi.allScenes && isEditorMode() && !scenePreviewUi.previewName && !scenePreviewUi.hideAssets) return;
  for (const cachedPreset of scenePresetAssetCache.values()) {
    setScenePresetVisible(cachedPreset, false);
  }
};

const ensureScenePresetLoaded = async function (targetScene, slideState) {
  const resolved = resolveSceneState(currentProjectData, slideState);

  const presetName = resolved.presetName;

  // =====================================
  // すでにロード済み
  // =====================================

  if (scenePresetAssetCache.has(presetName)) {
    return scenePresetAssetCache.get(presetName);
  }

  // =====================================
  // 現在ロード中
  //
  // 同じPresetをもう一度ロードしない
  // =====================================

  if (scenePresetLoadPromises.has(presetName)) {
    return await scenePresetLoadPromises.get(presetName);
  }

  // =====================================
  // 初回ロード
  // =====================================

  const targetProject = currentProjectData;
  const targetPreset = targetProject?.scenePresets?.[presetName];
  const targetUrls = activeProjectObjectUrls;
  const targetGlowLayer = activeGlowLayer;
  const targetDirectory = currentProjectDirectoryHandle;

  const loadPromise = loadScenePresetAssets(
    targetScene,
    presetName,
    [...resolved.assets],
    targetUrls,
    targetGlowLayer,
    targetDirectory,
  );

  scenePresetLoadPromises.set(presetName, loadPromise);

  try {
    const cachedPreset = await loadPromise;

    // ロード開始時のProject / Scene / Presetが
    // まだ有効か確認する
    const stillValid =
      currentProjectData === targetProject &&
      scene === targetScene &&
      currentProjectDirectoryHandle === targetDirectory &&
      activeProjectObjectUrls === targetUrls &&
      activeGlowLayer === targetGlowLayer &&
      currentProjectData?.scenePresets?.[presetName] === targetPreset &&
      scenePresetLoadPromises.get(presetName) === loadPromise;

    if (!stillValid) {
      disposeScenePresetLoadResult(cachedPreset);
      return null;
    }

    // ロード中に削除されたAssetを除外
    const currentAssets = targetPreset.assets ?? [];

    const validLoadedAssets = [];

    for (const loadedAsset of cachedPreset.assets ?? []) {
      const stillExists = currentAssets.some(
        (asset) => asset === loadedAsset.config,
      );

      if (!stillExists) {
        disposeLoadedSceneAsset(loadedAsset);
        continue;
      }

      // ロード中のTransform / Glow変更を反映
      applyAssetTransform(loadedAsset.rootNode, loadedAsset.config);

      configureAssetGlow(loadedAsset, targetGlowLayer);

      validLoadedAssets.push(loadedAsset);
    }

    cachedPreset.assets = validLoadedAssets;

    // ロード中に追加されたAssetは、
    // この時点ではまだキャッシュに存在しない
    scenePresetAssetCache.set(presetName, cachedPreset);

    // 初回ロード開始後に追加されたAssetを読み込む
    for (const assetConfig of currentAssets) {
      const exists = cachedPreset.assets.some(
        (item) => item.config?.id === assetConfig.id,
      );

      if (exists) continue;

      try {
        await loadAndRegisterSceneAsset(assetConfig, presetName);
      } catch (error) {
        console.warn(
          "Late-added Scene Asset load failed:",
          presetName,
          assetConfig.id,
          error,
        );
      }
    }

    // 追加Assetの非同期ロード中に
    // ProjectやPresetが変わった可能性も確認
    if (
      currentProjectData !== targetProject ||
      scene !== targetScene ||
      currentProjectData?.scenePresets?.[presetName] !== targetPreset ||
      scenePresetAssetCache.get(presetName) !== cachedPreset
    ) {
      if (scenePresetAssetCache.get(presetName) === cachedPreset) {
        scenePresetAssetCache.delete(presetName);
      }

      disposeScenePresetLoadResult(cachedPreset);
      return null;
    }

    return cachedPreset;
  } finally {
    // 別のロードPromiseを誤って削除しない
    if (scenePresetLoadPromises.get(presetName) === loadPromise) {
      scenePresetLoadPromises.delete(presetName);
    }
  }
};

const activateScenePreset = async function (slideState) {
  // 新しい切替要求を記録
  const generation = ++scenePresetActivationGeneration;

  if (!scene || !slideState) {
    return false;
  }

  // 呼び出し時点のSceneを保持
  const targetScene = scene;

  const resolved = resolveSceneState(currentProjectData, slideState);

  const presetName = resolved.presetName;

  // =====================================
  // すでに現在のPreset
  // =====================================

  if (activeScenePresetName === presetName) {
    return true;
  }

  // =====================================
  // Preset Load
  // =====================================

  let cachedPreset = null;

  try {
    cachedPreset = await ensureScenePresetLoaded(targetScene, slideState);
  } catch (error) {
    console.warn(
      "ScenePreset load failed:",
      {
        presetName,
        slideId: slideState?.id,
      },
      error,
    );

    showAppNotice(`ScenePreset load failed: "${presetName}"`, {
      level: "warning",
      key: `active-scene-preset:${presetName}`,
    });

    return false;
  }

  // =====================================
  // 古い切替要求ならCanvasを変更しない
  // =====================================
  if (generation !== scenePresetActivationGeneration || scene !== targetScene) {
    return false;
  }

  // =====================================
  // Activate
  // =====================================

  if (!cachedPreset) {
    console.warn("ScenePreset was not loaded:", presetName);

    showAppNotice(`ScenePreset was not loaded: "${presetName}"`, {
      level: "warning",
      key: `active-scene-preset:${presetName}`,
    });
    return false;
  }

  hideAllScenePresetAssets();
  // Asset IDs are Scene-scoped; prevent stale selections crossing Scene changes.
  if (!scenePreviewUi.allScenes) scene2fClearAssetSelection();
  canvasSelectedAssetIds.clear();
  selectedSceneAssetId = null;
  setScenePresetVisible(cachedPreset, !scenePreviewUi.hideAssets);

  activeScenePresetName = presetName;
  // Effects-1H: the displayed Scene owns the runtime atmosphere.
  refreshAtmosphereEffectsUI();

  refreshProjectPanelContext();

  // CanvasのPreset切替後にGizmoを同期
  syncEditingSceneAssetGizmo();

  return true;
};

// Gizmo
const initializeSlideGizmoManager = function (gizmoManager) {
  gizmoManager.usePointerToAttachGizmos = false;

  // =====================================
  // Gizmoオブジェクトを生成
  // =====================================

  gizmoManager.positionGizmoEnabled = true;

  gizmoManager.rotationGizmoEnabled = true;
  gizmoManager.scaleGizmoEnabled = true;

  // =====================================
  // Observer
  // =====================================

  registerSlideGizmoObservers(gizmoManager);

  // =====================================
  // 初期状態OFF
  // =====================================

  gizmoManager.positionGizmoEnabled = false;

  gizmoManager.rotationGizmoEnabled = false;

  gizmoManager.scaleGizmoEnabled = false;
};

const canAttachSlideGizmo = function () {
  if (scenePreviewUi.hideSlideObjects && isEditorMode()) return false;
  if (isEditorMode() && scene2oIsSlideHidden(getSlideGizmoTargetEntry()?.slideState?.id)) return false;
  if (slideGizmoMode === "off") {
    return false;
  }

  const targetEntry = getSlideGizmoTargetEntry();

  if (!targetEntry?.slideState?.mesh) {
    return false;
  }

  return !targetEntry.slideState.mesh.isDisposed();
};

const attachGizmoToCurrentSlide = function () {
  const gizmoManager = activeSlideGizmoManager;
  const targetScene = scene;

  if (!gizmoManager || !targetScene) {
    return;
  }

  const targetEntry = getSlideGizmoTargetEntry();
  const slideState = targetEntry?.slideState;
  const mesh = slideState?.mesh;

  if (!canAttachSlideGizmo()) {
    gizmoManager.attachToNode(null);
    return;
  }

  setSlideGizmoMode(slideGizmoMode);

  mesh.computeWorldMatrix(true);

  targetScene.onAfterRenderObservable.addOnce(() => {
    // =====================================
    // Scene / GizmoManagerの変更を検出
    // =====================================

    if (scene !== targetScene || activeSlideGizmoManager !== gizmoManager) {
      return;
    }

    // =====================================
    // GizmoがOFF / 複数選択時に中止
    // =====================================

    if (!canAttachSlideGizmo()) {
      return;
    }

    // =====================================
    // Current Slideが変わっていたら中止
    // =====================================

    const currentTarget = getSlideGizmoTargetEntry()?.slideState;

    if (
      !currentTarget ||
      currentTarget !== slideState ||
      currentTarget.mesh !== mesh
    ) {
      return;
    }

    // =====================================
    // Meshの有効性を確認
    // =====================================

    if (mesh.isDisposed()) {
      return;
    }

    // =====================================
    // Gizmoを取り付け
    // =====================================

    mesh.computeWorldMatrix(true);

    gizmoManager.attachToNode(scene2xEnsurePivot() ?? mesh);

    applySlideGizmoCoordinateMode();
    applySlideGizmoSnap();
  });
};

const refreshCurrentSlideGizmoAfterTransform = function () {
  if (slideGizmoMode === "off" || !activeSlideGizmoManager) {
    return;
  }

  const slideState = getSlideGizmoTargetEntry()?.slideState;
  const mesh = slideState?.mesh;

  if (!mesh || mesh.isDisposed() || !canAttachSlideGizmo()) {
    detachSlideGizmo();
    return;
  }

  // World Matrixをまず更新
  mesh.computeWorldMatrix(true);

  // 古いAttach状態を一度捨てる
  activeSlideGizmoManager.attachToNode(null);

  // 新しいTransformでAttachし直す
  attachGizmoToCurrentSlide();
};

const detachSlideGizmo = function () {
  if (!activeSlideGizmoManager) {
    return;
  }

  activeSlideGizmoManager.attachToNode(null);
};

const setSlideGizmoMode = function (mode) {
  slideGizmoMode = mode;

  if (!activeSlideGizmoManager) {
    return;
  }

  activeSlideGizmoManager.positionGizmoEnabled = false;

  activeSlideGizmoManager.rotationGizmoEnabled = false;
  activeSlideGizmoManager.scaleGizmoEnabled = false;

  switch (mode) {
    case "position":
      activeSlideGizmoManager.positionGizmoEnabled = true;

      break;

    case "rotation":
      activeSlideGizmoManager.rotationGizmoEnabled = true;
      break;
    case "scale":
      activeSlideGizmoManager.scaleGizmoEnabled = true;
      break;

    case "off":
    default:
      break;
  }

  applySlideGizmoCoordinateMode();

  applySlideGizmoSnap();

  refreshSlideGizmoUi();
};

// ============================================================
// 6E. Scene / Project Lifecycle
// ============================================================
//
// Editor Sceneの構築・切替・破棄と、
// Project Open / New Project に関するlifecycle処理。

const buildEmptyEditorScene = async function (engine) {
  const newScene = new Scene(engine);

  try {
    genLights(newScene);

    const newCamera = genCamera(newScene);

    const environmentController = createEnvironment(newScene);

    setPointerEvents(newScene);

    const newActionUiTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      "UI",
      true,
      newScene,
    );

    const gizmoManager = new GizmoManager(newScene, 1, new UtilityLayerRenderer(newScene));
    initializeAssetGizmoManager(gizmoManager);
    const slideGizmoManager = new GizmoManager(newScene, 1, new UtilityLayerRenderer(newScene));
    initializeSlideGizmoManager(slideGizmoManager);

    return {
      scene: newScene,

      camera: newCamera,

      advancedTexture: newActionUiTexture,

      slides: [],

      objectUrls: new Set(),

      environmentController: environmentController,

      glowLayer: null,

      gizmoManager: gizmoManager,
      slideGizmoManager: slideGizmoManager,
    };
  } catch (error) {
    newScene.dispose();

    throw error;
  }
};

const disposeActiveEditorGizmos = function () {
  if (activeGizmoManager) {
    activeGizmoManager.dispose();

    activeGizmoManager = null;
  }

  if (activeSlideGizmoManager) {
    activeSlideGizmoManager.dispose();

    activeSlideGizmoManager = null;
  }
};

const buildProjectEditorScene = async function (
  engine,
  states,
  directoryHandle,
) {
  const newScene = new Scene(engine);

  const objectUrls = new Set();

  try {
    genLights(newScene);

    const newCamera = genCamera(newScene);

    const environmentController = createEnvironment(newScene);

    // -------------------------
    // GlowLayer
    // -------------------------

    const glowLayer = scene4mNoGlow ? null : new GlowLayer("scene-glow", newScene, {
      mainTextureRatio: 0.5,
    });

    if (glowLayer) glowLayer.blurKernelSize = 16;

    const statesWithMeshes = await createSlideMeshes(
      states,
      newScene,
      directoryHandle,
      objectUrls,
    );

    // スライドはGlow対象外
    for (const slideState of statesWithMeshes) {
      if (slideState.mesh) {
        registerSlideGlowOccluder(glowLayer, slideState.mesh);
      }
    }

    setPointerEvents(newScene);

    const newActionUiTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      "UI",
      true,
      newScene,
    );

    // ---------------------------------
    // Gizmo専用 Utility Layer
    // ---------------------------------

    // Scene-4M: removed unused UtilityLayerRenderer (no consumers).

    // ---------------------------------
    // GizmoManager
    // ---------------------------------

    const assetGizmoUtilityLayer = new UtilityLayerRenderer(newScene);

    const gizmoManager = new GizmoManager(newScene, 1, assetGizmoUtilityLayer);

    initializeAssetGizmoManager(gizmoManager);

    // ---------------------------------
    // SlideGizmoManager
    // ---------------------------------

    const slideGizmoUtilityLayer = new UtilityLayerRenderer(newScene);

    const slideGizmoManager = new GizmoManager(
      newScene,
      1,
      slideGizmoUtilityLayer,
    );

    initializeSlideGizmoManager(slideGizmoManager);

    return {
      scene: newScene,

      camera: newCamera,

      advancedTexture: newActionUiTexture,

      slides: statesWithMeshes,

      objectUrls: objectUrls,

      environmentController: environmentController,

      glowLayer: glowLayer,

      gizmoManager: gizmoManager,

      slideGizmoManager: slideGizmoManager,
    };
  } catch (error) {
    newScene.dispose();

    revokeObjectUrls(objectUrls);

    throw error;
  }
};

const activateBuiltScene = function (built) {
  const oldScene = scene;

  const oldGizmoManager = activeGizmoManager;
  const oldSlideGizmoManager = activeSlideGizmoManager;

  const oldObjectUrls = activeProjectObjectUrls;

  // =========================
  // 新Scene採用
  // =========================

  scene = built.scene;

  // activeGizmoManager = built.gizmoManager ?? null;

  camera = built.camera;
  atmosphereEffectsController?.dispose();
  atmosphereEffectsController = createAtmosphereEffects(scene, () => camera);
  refreshAtmosphereEffectsUI();
  refreshCameraFramingOffsetUI();

  // 新しいCameraは必ず「視点操作OFF」から開始
  camera.detachControl();

  cameraControlViaMouse = false;
  cameraNavigation?.stop();

  cameraControlStatus.textContent = t("開始");

  cameraControlButton.classList.remove("active");

  webglCanvas.removeEventListener("wheel", handleWheelForCameraControl);

  actionUiTexture = built.advancedTexture;

  activeEnvironmentController = built.environmentController ?? null;

  activeGlowLayer = built.glowLayer ?? null;

  slideStates = built.slides ?? [];
  // Recreate persisted UV annotations whenever a new Babylon Scene is activated.
  slideDrawing.refreshAll();

  slideCount = slideStates.length;

  currentSlideIndex = slideCount > 0 ? 0 : -1;

  activeProjectObjectUrls = built.objectUrls ?? new Set();

  // =========================
  // Camera
  // =========================

  initializeCameraState();

  if (currentSlideIndex >= 0) {
    setCameraTransitionTarget();
  }

  // Gizmo
  selectedSceneAssetId = null;

  activeGizmoManager = built.gizmoManager ?? null;

  activeSlideGizmoManager = built.slideGizmoManager ?? null;

  assetGizmoMode = "position";

  refreshAssetGizmoButtons();

  // =========================
  // Update
  // =========================

  scene.registerBeforeRender(() => {
    update(scene);
  });

  // =========================
  // 古いScene
  // =========================

  if (oldGizmoManager && oldGizmoManager !== activeGizmoManager) {
    oldGizmoManager.dispose();
  }

  if (oldSlideGizmoManager && oldSlideGizmoManager !== activeSlideGizmoManager) {
    oldSlideGizmoManager.dispose();
  }
  if (oldScene && oldScene !== scene) {
    oldScene.dispose();
  }

  revokeObjectUrls(oldObjectUrls);
};

const prepareForProjectOpen = function () {
  clearProjectAudioCache();

  resetScenePresetRuntime();

  selectedSceneAssetId = null;
};

const loadProjectDataForOpen = async function (directoryHandle) {
  const rawData = await readJsonFileFromDirectory(
    directoryHandle,
    "project.json",
  );

  const normalizedData = normalizeProjectData(rawData);

  const newSlideStates = createSlideStatesFromProjectData(normalizedData);

  return {
    rawData,
    normalizedData,
    slideStates: newSlideStates,
  };
};

const initializeProjectCurrentSlide = async function () {
  selectedSlideIds.clear();

  // =====================================
  // Slide IDs
  // =====================================

  initializeUsedSlideIds();

  initializeNextSlideId();

  if (currentSlideIndex < 0) {
    return;
  }

  const slideState = getCurrentSlideState();

  if (!slideState) {
    return;
  }

  // =====================================
  // Selection
  // =====================================

  // Scene-3Y: select Current upon opening a project, without selecting assets.
  // Selection is session-only and is not persisted into project.json.
  selectedSlideIds.add(slideState.id);
  slideSelectionAnchorIndex = currentSlideIndex;

  refreshSlideSelectionUi();

  // =====================================
  // Scene Assets
  // =====================================

  await activateScenePreset(slideState);

  // =====================================
  // Environment
  // =====================================

  await applyCurrentEnvironment();

  // =====================================
  // Inspector
  //
  // ここで最初のAsset IDも確定
  // =====================================

  refreshSceneAssetEditor();

  // =====================================
  // Gizmo
  // =====================================

  // Inspector focus is not a selection. Both gizmos remain detached until
  // an object is explicitly selected by the user.
  detachAssetGizmo();
  detachSlideGizmo();
};

const refreshProjectOpenUi = async function (rawData) {
  // =====================================
  // Project Asset Selectors
  // =====================================

  await refreshProjectAssetFileSelector();

  await refreshSkyboxSetSelector();

  // =====================================
  // Editors / Inspectors
  // =====================================

  syncSkyboxEditorFromEnvironment();

  // Scene-3X: populate preset choices before inspector layout and visibility.
  refreshSharedPresetControls();
  refreshSlideInspectorMode();

  refreshSlideSettingsInspector();

  refreshCurrentSlidePropertiesUi();

  refreshSceneAssetEditor();

  refreshSlideManagementUi();

  // =====================================
  // Views
  // =====================================

  renderTable();

  renderSlideThumbnails();

  // =====================================
  // Project Status
  // =====================================

  currentProjectName.textContent = projectName;

  if (rawData) {
    projectStatus.notice("読み込み完了");
  } else {
    projectStatus.notice("project.jsonなし / 新規Project");
  }

  // Complete both Scene and Slide inspector initialization for the first
  // Current slide. No synthetic selection or navigation is required.
  refreshEditingScenePresetSelector();
  refreshSlideInspectorMode();
  scene3kQueueSync();
};

const openProjectFromDirectory = async function (directoryHandle) {
  if (isPresentationMode()) {
    await exitPresentationMode();
  }

  projectStatus.notice("読み込み中...", 0);

  // =====================================
  // Phase 1: 新Projectの準備
  // =====================================

  // この段階では現在のProjectを変更しない
  const {
    rawData,
    normalizedData,
    slideStates: newSlideStates,
  } = await loadProjectDataForOpen(directoryHandle);

  const built = await buildProjectEditorScene(
    engine,
    newSlideStates,
    directoryHandle,
  );

  // =====================================
  // Phase 2: 新Projectの採用
  // =====================================

  prepareForProjectOpen();
  // Screen annotations are session-only and must not leak into another project.
  drawingController.clearScreenDrawings({ recordHistory: false });

  currentProjectDirectoryHandle = directoryHandle;
  currentProjectData = normalizedData;
  refreshAtmosphereEffectsUI();
  refreshCameraFramingOffsetUI();

  projectName = normalizedData.name || directoryHandle.name || "Untitled";

  applyPresentationSettingsFromProjectData();
  refreshPresentationSettingsUi();
  refreshProjectBgmUi();

  initializeUsedSceneAssetIds();

  clearEditorHistory();
  disposeActiveEditorGizmos();
  // Scene-2S: selection belongs to the previous editor session, not to
  // project.json. Drop both the per-Scene keys and focused inspector ID.
  scene2sClearSelectionForProjectOpen();

  activateBuiltScene(built);

  // =====================================
  // Scene採用後の初期化
  // =====================================

  // この時点で新しいSceneは採用済み。
  // 以後の失敗では旧Sceneへの復帰を試みない。

  const initializationErrors = [];

  // =====================================
  // 初期Slide / ScenePreset / Environment
  // =====================================

  try {
    await initializeProjectCurrentSlide();
  } catch (error) {
    console.error("Project initial slide initialization failed:", error);

    initializationErrors.push({
      stage: "Initial Slide",
      error,
    });
  }

  // =====================================
  // UI
  // =====================================

  editingScenePresetName = null;
  // Scene-3X: discard pending input/queued Transform updates from the old
  // project, while preserving the user's chosen scope and input method.
  scene3xResetTransformSession();

  try {
    await refreshProjectOpenUi(rawData);
  } catch (error) {
    console.error("Project UI initialization failed:", error);

    initializationErrors.push({
      stage: "Project UI",
      error,
    });
  }

  // =====================================
  // Asset Gizmo
  // =====================================

  try {
    refreshSceneAssetEditor();

    // Scene-2S: selecting the first entry in an inspector is only focus;
    // it must not attach a Gizmo until Selection actually contains it.
    syncEditingSceneAssetGizmo();
    refreshCurrentSlideGizmoAfterTransform();
  } catch (error) {
    console.error("Project Gizmo initialization failed:", error);

    initializationErrors.push({
      stage: "Asset Gizmo",
      error,
    });
  }

  // =====================================
  // Scene-2S: synchronize the visible editor with the now-empty Selection.
  // In particular, stale highlights and gizmos from an earlier project must
  // not survive an open, and hidden counts are zero for the new project.
  // =====================================
  try {
    scene2oEnsureVisibilityProject();
    scene2oRefreshHiddenCanvas();
    renderSlideThumbnails();
    refreshSlideSelectionUi();
  } catch (error) {
    console.error("Project selection UI synchronization failed:", error);
    initializationErrors.push({stage: "Selection UI", error});
  }

  // =====================================
  // 初期化結果
  // =====================================

  if (rawData) projectStatus.markSaved();
  else projectStatus.markNew();

  if (initializationErrors.length > 0) {
    const failedStages = initializationErrors
      .map((item) => item.stage)
      .join(", ");

    console.warn(
      "Project opened with initialization errors:",
      initializationErrors,
    );

    projectStatus.notice(`読み込み完了（一部初期化失敗: ${failedStages}）`);

    showAppNotice("Projectを開きましたが、一部の初期化に失敗しました。", {
      level: "warning",
      key: "project-open-partial-initialization",
    });
  }
};

const applySlideGizmoCoordinateMode = function () {
  if (!activeSlideGizmoManager) {
    return;
  }

  const isLocal = slideGizmoCoordinateMode === "local";

  const positionGizmo = activeSlideGizmoManager.gizmos.positionGizmo;

  const rotationGizmo = activeSlideGizmoManager.gizmos.rotationGizmo;
  const scaleGizmo = activeSlideGizmoManager.gizmos.scaleGizmo;

  // Scene-4G: always orient Scale handles along the Slide's local axes.
  if (scaleGizmo) scaleGizmo.updateGizmoRotationToMatchAttachedMesh = true;
  if (positionGizmo) {
    positionGizmo.updateGizmoRotationToMatchAttachedMesh = isLocal;
  }

  if (rotationGizmo) {
    // Scene-4H hotfix: Babylon cannot attach a mesh-aligned rotation gizmo
    // to a node whose world transform contains non-uniform scale.
    // Use world-aligned handles as a safe fallback until the uniform-scale
    // proxy/pivot rotation path is implemented.
    const node = activeSlideGizmoManager.attachedNode;
    if (node && typeof node.computeWorldMatrix === "function") node.computeWorldMatrix(true);
    const worldScale = new Vector3(1, 1, 1);
    if (node?.getWorldMatrix) node.getWorldMatrix().decompose(worldScale);
    rotationGizmo.updateGizmoRotationToMatchAttachedMesh =
      isLocal && (node === scene2xPivotNode || canMatchLocalRotation(worldScale));
  }
};

// Scene-3W: No duplicate Slide Snap selector remains.
const refreshSlideGizmoSnapUi = function () {};

const applySlideGizmoSnap = function () {
  if (!activeSlideGizmoManager) {
    return;
  }

  const positionGizmo = activeSlideGizmoManager.gizmos.positionGizmo;

  const rotationGizmo = activeSlideGizmoManager.gizmos.rotationGizmo;

  const positionSnap =
    slideGizmoSnapEnabled && slideGizmoMode === "position"
      ? slideGizmoSnapValues.position
      : 0;

  const rotationSnap =
    slideGizmoSnapEnabled && slideGizmoMode === "rotation"
      ? degToRad(slideGizmoSnapValues.rotation)
      : 0;

  if (positionGizmo) {
    positionGizmo.xGizmo.snapDistance = positionSnap;

    positionGizmo.yGizmo.snapDistance = positionSnap;

    positionGizmo.zGizmo.snapDistance = positionSnap;
  }

  if (rotationGizmo) {
    rotationGizmo.xGizmo.snapDistance = rotationSnap;

    rotationGizmo.yGizmo.snapDistance = rotationSnap;

    rotationGizmo.zGizmo.snapDistance = rotationSnap;
  }
  const scaleGizmo = activeSlideGizmoManager.gizmos.scaleGizmo;
  setScaleGizmoSnap(scaleGizmo,
    slideGizmoSnapEnabled && slideGizmoMode === "scale" ? slideGizmoSnapValues.scale : 0);
};

// Scene-3W: Only the shared Selection Gizmo renders button states.
// Keep this adapter for callers that refresh the underlying GizmoManager.
const refreshSlideGizmoUi = function () {};

const syncSlideTransformFromMesh = function ({
  applyCameraToViewport = false,
  targetSlide = null,
  cameraPoseBefore = null,
} = {}) {
  const slideState = targetSlide ?? getSlideGizmoTargetEntry()?.slideState;

  const mesh = slideState?.mesh;

  if (!slideState || !mesh || mesh.isDisposed()) {
    return;
  }

  // =====================================
  // Mesh → Slide State
  // =====================================

  slideState.position = mesh.position.clone();

  if (mesh.rotationQuaternion) {
    slideState.rotationQuaternion = mesh.rotationQuaternion.clone().normalize();
  } else {
    slideState.rotationQuaternion = Quaternion.FromEulerAngles(
      mesh.rotation.x,
      mesh.rotation.y,
      mesh.rotation.z,
    ).normalize();
  }

  // Scene-2G: Scale Gizmo edits mesh.scaling, not the Inspector's scale state.
  if (slideGizmoMode === "scale") {
    const scale = mesh.scaling;
    if ([scale.x,scale.y,scale.z].every(v => Number.isFinite(v) && v > 0)) {
      slideState.slideScale = normalizeSlideScale(scale);
    }
  }

  // =====================================
  // 保存用Camera Poseは更新
  // =====================================

  if (cameraPoseBefore) {
    syncCameraPoseAfterSlideTransform(slideState, cameraPoseBefore);
  } else {
    syncCameraPoseToSlide(slideState);
  }

  // =====================================
  // 実Viewport Cameraは必要時だけ更新
  // =====================================

  if (applyCameraToViewport) {
    applyCameraPoseToViewport(
      slideState.cameraPosition,
      slideState.cameraRotation,
    );
  }

  // =====================================
  // UI
  // =====================================

  refreshCurrentSlidePropertiesUi();

  refreshSharedTransformControls();

  renderTable();
};

// Apply the Current Slide gizmo's rigid delta to the other selected slides.
// Always derive results from drag-start snapshots to avoid accumulating errors.
// Scene-2W: the drag handle reports the delta; the same pre-drag snapshot is
// applied to EVERY selected object, including the active handle object.
// This prevents the active Slide being pinned while the other Slides orbit
// the Selection Center. It also makes the Slide and Asset adapters equivalent.
const syncSlideGizmoGroupFromPivot = function () {
  if (!slideGizmoGroupBefore?.length || !slideGizmoDragTarget) return;
  const pivotBefore = slideGizmoGroupBefore.find(entry => entry.slideState === slideGizmoDragTarget)?.before;
  if (!pivotBefore) return;
  const pivotAfter = slideGizmoDragTarget;
  const deltaPosition = pivotAfter.position.subtract(pivotBefore.position);
  const deltaRotation = pivotAfter.rotationQuaternion.clone().normalize()
    .multiply(pivotBefore.rotationQuaternion.clone().normalize().conjugate()).normalize();
  const initialScale = normalizeSlideScale(pivotBefore.slideScale);
  const changedScale = normalizeSlideScale(pivotAfter.slideScale);
  const ratios = [changedScale.x / initialScale.x, changedScale.y / initialScale.y, changedScale.z / initialScale.z];
  const allPositions = [
    ...slideGizmoGroupBefore.map(x => x.before.position),
    ...scene2wSlideGizmoAssetsBefore.map(x => x.before.position),
  ];
  const anchor = scene2vGroupAnchor === 'center'
    ? scene2vAveragePosition(allPositions) ?? pivotBefore.position
    : pivotBefore.position;
  const pivotMode = transformPivotMode('slide');
  const transformedPosition = (position) => {
    const initial = Vector3.FromArray(Array.isArray(position) ? position : position.asArray());
    if (slideGizmoMode === 'position') return initial.add(deltaPosition);
    if (pivotMode === 'individual') return initial;
    if (slideGizmoMode === 'rotation') return anchor.add(initial.subtract(anchor).applyRotationQuaternion(deltaRotation));
    if (slideGizmoMode === 'scale') return Vector3.FromArray(
      scalePositionAboutPivot(initial.asArray(), anchor.asArray(), ratios));
    return initial;
  };
  for (const {slideState, before} of slideGizmoGroupBefore) {
    slideState.position = transformedPosition(before.position);
    if (slideGizmoMode === 'rotation') {
      slideState.rotationQuaternion = deltaRotation.multiply(before.rotationQuaternion).normalize();
      syncCameraPoseAfterSlideTransform(slideState, before);
    } else if (slideGizmoMode === 'scale') {
      const initial = normalizeSlideScale(before.slideScale);
      slideState.slideScale = {
        x: initial.x * ratios[0], y: initial.y * ratios[1], z: initial.z * ratios[2],
      };
      slideState.cameraPosition = Vector3.FromArray(followSlideTranslation(
        before.cameraPosition.asArray(), before.position.asArray(), slideState.position.asArray()));
    } else {
      slideState.cameraPosition = before.cameraPosition.add(deltaPosition);
    }
    applySlideTransformStateToMesh(slideState);
  }
  for (const {presetName, assetId, before} of scene2wSlideGizmoAssetsBefore) {
    const asset = getScenePresetConfigByName(presetName)?.assets?.find(x => x.id === assetId);
    if (!asset) continue;
    const next = cloneAssetTransform(before);
    next.position = transformedPosition(before.position).asArray();
    if (slideGizmoMode === 'rotation') {
      next.rotation = quaternionToArray(deltaRotation.multiply(
        quaternionFromArray(before.rotation, [0,0,0,1])).normalize());
    } else if (slideGizmoMode === 'scale') {
      next.scale = multiplyScale(before.scale, ratios);
    }
    asset.transform = next;
    const loaded = getLoadedAssetByPresetAndId(presetName,assetId);
    if (loaded?.rootNode) {
      applyAssetTransform(loaded.rootNode, asset);
      loaded.rootNode.computeWorldMatrix(true);
    }
  }
};

const registerSlideGizmoDragBehavior = function (dragBehavior) {
  if (!dragBehavior) return;

  dragBehavior.onDragStartObservable.add(() => {
    scene4iPivotCancelled = false;
    if (scene2xShouldAttachPivot() && scene2xStartPivotDrag(slideGizmoMode)) {
      slideGizmoDragTarget = null;
      slideGizmoGroupBefore = null;
      scene2wSlideGizmoAssetsBefore = [];
      suspendCameraControlForGizmo();
      return;
    }
    const slideState = getSlideGizmoTargetEntry()?.slideState ?? null;
    slideGizmoDragTarget = slideState;
    slideGizmoGroupBefore = null;
    scene2wSlideGizmoAssetsBefore = [];

    if (slideState?.mesh && !slideState.mesh.isDisposed()) {
      slideTransformBeforeGizmoEdit = createSlideTransformHistorySnapshot(slideState);
      // Lock the selection for the entire drag; later selection updates must not
      // silently change the drag's target set.
      slideGizmoGroupBefore = getSelectedSlideEntries()
        .filter(({ slideState: state }) => state.mesh && !state.mesh.isDisposed())
        .map(({ slideState: state }) => ({
          slideState: state,
          before: createSlideTransformHistorySnapshot(state),
        }));
      scene2wSlideGizmoAssetsBefore = scene2cGetGroupAssets().map(({presetName,asset})=>({
        presetName, assetId:asset.id, before:cloneAssetTransform(ensureAssetTransform(asset)),
      }));
    } else {
      slideGizmoDragTarget = null;
      slideTransformBeforeGizmoEdit = null;
    }
    suspendCameraControlForGizmo();
  });

  dragBehavior.onDragObservable.add(() => {
    if (scene4iPivotCancelled) return;
    if (scene2xPivotDrag) {scene2xApplyPivotDrag(); scene3cRefreshAbsolute(); return;}
    if (!slideGizmoDragTarget) return;
    syncSlideTransformFromMesh({
      targetSlide: slideGizmoDragTarget,
      cameraPoseBefore: slideTransformBeforeGizmoEdit,
    });
    syncSlideGizmoGroupFromPivot();
    scene3cRefreshAbsolute();
  });

  dragBehavior.onDragEndObservable.add(() => {
    if (scene4iPivotCancelled) { scene4iPivotCancelled = false; restoreCameraControlAfterGizmo(); return; }
    if (scene2xPivotDrag) {
      scene2xEndPivotDrag();
      restoreCameraControlAfterGizmo();
      return;
    }
    const slideState = slideGizmoDragTarget;
    if (slideState && slideTransformBeforeGizmoEdit) {
      syncSlideTransformFromMesh({
        targetSlide: slideState,
        cameraPoseBefore: slideTransformBeforeGizmoEdit,
      });
      syncSlideGizmoGroupFromPivot();

      const changes = (slideGizmoGroupBefore ?? []).map(({slideState: state, before}) => ({
        slideId: state.id, before, after: createSlideTransformHistorySnapshot(state),
      })).filter(({before, after}) => !slideTransformHistoryStatesEqual(before, after));
      const assetChanges = scene2wSlideGizmoAssetsBefore.map(({presetName,assetId,before})=>{
        const asset = getScenePresetConfigByName(presetName)?.assets?.find(x=>x.id===assetId);
        return asset ? {presetName,assetId,before,after:cloneAssetTransform(ensureAssetTransform(asset))} : null;
      }).filter(change=>change && !assetTransformsEqual(change.before,change.after));
      if (changes.length || assetChanges.length) pushEditorHistory({
        type: 'scene2c-group-transform',presetName:editingScenePresetName,
        slides:changes,assets:assetChanges,
      });
    }
    slideGizmoDragTarget = null;
    slideTransformBeforeGizmoEdit = null;
    slideGizmoGroupBefore = null;
    scene2wSlideGizmoAssetsBefore = [];
    restoreCameraControlAfterGizmo();
    refreshSharedTransformControls();
    renderTable();
    scene3cRefreshAbsolute();
  });
};

const registerSlideGizmoObservers = function (gizmoManager) {
  const positionGizmo = gizmoManager.gizmos.positionGizmo;

  const rotationGizmo = gizmoManager.gizmos.rotationGizmo;

  registerSlideGizmoDragBehavior(positionGizmo?.xGizmo?.dragBehavior);

  registerSlideGizmoDragBehavior(positionGizmo?.yGizmo?.dragBehavior);

  registerSlideGizmoDragBehavior(positionGizmo?.zGizmo?.dragBehavior);

  registerSlideGizmoDragBehavior(rotationGizmo?.xGizmo?.dragBehavior);

  registerSlideGizmoDragBehavior(rotationGizmo?.yGizmo?.dragBehavior);

  registerSlideGizmoDragBehavior(rotationGizmo?.zGizmo?.dragBehavior);
  const scaleGizmo = gizmoManager.gizmos.scaleGizmo;
  registerSlideGizmoDragBehavior(scaleGizmo?.xGizmo?.dragBehavior);
  registerSlideGizmoDragBehavior(scaleGizmo?.yGizmo?.dragBehavior);
  registerSlideGizmoDragBehavior(scaleGizmo?.zGizmo?.dragBehavior);
  registerSlideGizmoDragBehavior(scaleGizmo?.uniformScaleGizmo?.dragBehavior);
};

// ============================================================
// 6F. Input / Frame Update Runtime
// ============================================================
//
// Pointer / Keyboard入力の処理と、
// render loopから呼ばれるframe update処理。

// Scene-1Y: resolve only genuine Slide meshes or loaded Scene Asset descendants.
// Gizmos, camera/slide guides and other editor helpers are never selectable.
const findCanvasEditorPickTarget = function (pickedMesh) {
  if (!pickedMesh || !scene || scenePreviewUi.previewName) return null;
  for (let node = pickedMesh; node; node = node.parent) {
    const index = slideStates.findIndex(state => state.mesh === node);
    if (index >= 0) return scenePreviewUi.hideSlideObjects ? null : scene2oIsSlideHidden(slideStates[index].id) ? null : {kind: "slide", index};
  }
  if (scenePreviewUi.hideAssets) return null;
  const candidateNames = scenePreviewUi.allScenes && isEditorMode()
    ? [...scenePresetAssetCache.keys()]
    : [activeScenePresetName];
  for (const presetName of candidateNames) {
    const cached = scenePresetAssetCache.get(presetName);
    for (const loaded of cached?.assets ?? []) {
      if (!loaded.rootNode) continue;
      for (let node = pickedMesh; node; node = node.parent) {
        if (node === loaded.rootNode) return scene2oIsAssetHidden(presetName,loaded.config?.id) ? null : {kind: 'asset', id: loaded.config?.id, presetName};
      }
    }
  }
  return null;
};

// Canvas selection can coexist across Slide and Asset types. Only the focused
// object owns a Gizmo; bulk transforms are deliberately not implied by selection.
const selectFromEditorCanvas = async function (pickInfo, { additive = false } = {}) {
  if (!isEditorMode() || !scene || scenePreviewUi.previewName || drawingController.isActive()) return;
  const picked = pickInfo?.hit ? findCanvasEditorPickTarget(pickInfo.pickedMesh) : null;
  if (!picked) {
    // Clear only on true empty canvas. A Gizmo/guide pick must not clear
    // the selection while the user is attempting a transform.
    if (!additive && !pickInfo?.hit) scene2qClearSelection();
    return;
  }
  if (picked.kind === "slide") {
    const state = slideStates[picked.index];
    if (!state) return;
    if (additive) {
      toggleSlideSelection(picked.index);
      renderSlideThumbnails();
      refreshSlideSelectionUi();
    } else {
      canvasSelectedAssetIds.clear();
      scene2fClearAssetSelection();
      await selectSlideByIndex(picked.index, {moveCamera:false});
    }
  } else if (picked.kind === "asset" && picked.id) {
    const pickedPreset = picked.presetName ?? activeScenePresetName;
    if (editingScenePresetName !== pickedPreset) {
      commitAssetTransformNumericEdit();
      if (!scenePreviewUi.allScenes || !additive) scene2fClearAssetSelection();
      canvasSelectedAssetIds.clear();
      selectedSceneAssetId = null;
      editingScenePresetName = pickedPreset;
      for (const id of canvasSelectedAssetKeys.get(pickedPreset) ?? []) canvasSelectedAssetIds.add(id);
      refreshEditingScenePresetSelector();
    }
    commitAssetTransformNumericEdit();
    if (additive) {
      if (canvasSelectedAssetIds.has(picked.id)) {
        canvasSelectedAssetIds.delete(picked.id);
        scene2fSelectAsset(pickedPreset,picked.id,false);
        if (selectedSceneAssetId === picked.id) {
          selectedSceneAssetId = [...canvasSelectedAssetIds].at(-1) ?? null;
        }
      } else {
        canvasSelectedAssetIds.add(picked.id);
        scene2fSelectAsset(pickedPreset,picked.id);
        selectedSceneAssetId = picked.id;
      }
    } else {
      canvasSelectedAssetIds.clear();
      scene2fClearAssetSelection();
      canvasSelectedAssetIds.add(picked.id);
      scene2fSelectAsset(pickedPreset,picked.id);
      selectedSlideIds.clear();
      renderSlideThumbnails();
      refreshSlideSelectionUi();
      selectedSceneAssetId = picked.id;
    }
    refreshSceneAssetEditor();
    syncEditingSceneAssetGizmo();
    scene2cUpdateGroupStatus();
  }
  // Selection changes keep the one-toolbar active target in sync.
  scene2uLastActiveKind = picked.kind;
  // Preserve the active transform mode while changing the selection focus.
  // A selection with zero eligible objects must have no attached Gizmo.
  const priorMode = slideGizmoMode !== 'off' ? slideGizmoMode : assetGizmoMode;
  if (priorMode !== 'off') {
    const nextKind = scene2uChooseActiveKind();
    if (nextKind) scene2uActivateGizmo(priorMode,nextKind);
    else scene2uActivateGizmo('off');
  }
  document.dispatchEvent(new Event('slidespace:selection-changed'));
  // Keep the inspector on the appropriate Gizmo, including Ctrl/Cmd picks.
  document.dispatchEvent(new CustomEvent('slidespace:reveal-transform', {
    detail: { kind: picked.kind },
  }));
};

// ポインターイベントの設定をする
const setPointerEvents = function (targetScene) {
  targetScene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type === PointerEventTypes.POINTERTAP &&
        pointerInfo.event?.button === 0 &&
        !pointerInfo.event?.shiftKey && !pointerInfo.event?.altKey) {
      void selectFromEditorCanvas(pointerInfo.pickInfo, {additive: Boolean(pointerInfo.event?.ctrlKey || pointerInfo.event?.metaKey)})
        .catch(error => console.warn("Canvas selection failed:", error));
    }
    switch (pointerInfo.type) {
      case PointerEventTypes.POINTERDOWN:
      case PointerEventTypes.POINTERUP:
      case PointerEventTypes.POINTERWHEEL:
      case PointerEventTypes.POINTERPICK:
      case PointerEventTypes.POINTERTAP:
      case PointerEventTypes.POINTERDOUBLETAP:
        if (cameraControlViaMouse) {
          cameraControlViaKeyboard = false;
        }

        break;
    }
  });
};

// キーボードイベントの設定をする
// Improve-1C: shortcut help, built from verified key handlers.
const shortcutHelpDialog = document.getElementById('shortcutHelpDialog');
const shortcutHelpSearch = document.getElementById('shortcutHelpSearch');
const shortcutHelpItems = document.getElementById('shortcutHelpItems');
const shortcutHelpRows = [
  ['Edit','Create blank slide','G'],
  ['Edit','Start presentation','P'],
  ['Edit','Cycle selection gizmo','M'],
  ['Edit','Eraser','N'],
  ['Edit','Save screenshot','Y'],
  ['Edit','Move Current in front of camera','R'],
  ['Edit','Toggle fullscreen','T'],
  ['Edit','Undo','Ctrl+Z'],
  ['Edit','Redo','Ctrl+Y'],
  ['Edit','Move selected slides left','Alt+←'],
  ['Edit','Move selected slides right','Alt+→'],
  ['Edit','Move selected slides to start','Alt+Home'],
  ['Edit','Move selected slides to end','Alt+End'],
  ['Edit','Cancel or clear selection','Esc'],
  ['Presentation','Next slide','→ / Space / Enter / C'],
  ['Presentation','Previous slide','← / PageUp / Z'],
  ['Presentation','Neon pen','B'],
  ['Presentation','Standard pen','V'],
  ['Presentation','Current slide','X'],
  ['Presentation','First slide','H'],
  ['Presentation','Eraser','N'],
  ['Presentation','Save screenshot','Y'],
  ['Presentation','Camera control','F'],
  ['Presentation','Move camera','W / A / S / D / Q / E'],
  ['Presentation','Rotate camera','I / J / K / L / U / O'],
  ['Presentation','Exit presentation or close overlay','Esc'],
];
const shortcutHelpNames = {
  'Edit':'編集', 'Presentation':'プレゼン', 'Create blank slide':'スライドを新規作成',
  'Start presentation':'発表を開始', 'Cycle selection gizmo':'ギズモ切替', 'Eraser':'消しゴム', 'Current slide':'現在のスライド', 'First slide':'最初のスライド', 'Move Current in front of camera':'Currentをカメラ前に移動',
  'Save screenshot':'スクリーンショット保存', 'Toggle fullscreen':'全画面切替',
  'Undo':'元に戻す', 'Redo':'やり直し',
  'Move selected slides left':'選択スライドを左へ移動',
  'Move selected slides right':'選択スライドを右へ移動',
  'Move selected slides to start':'選択スライドを先頭へ',
  'Move selected slides to end':'選択スライドを末尾へ',
  'Cancel or clear selection':'キャンセル／選択解除',
  'Previous slide':'前のスライド', 'Next slide':'次のスライド',
  'Neon pen':'ネオンペン', 'Standard pen':'通常ペン', 'Camera control':'カメラ操作',
  'Move camera':'カメラ移動', 'Rotate camera':'カメラ回転',
  'Exit presentation or close overlay':'発表を終了／表示を閉じる',
};
function renderShortcutHelp() {
  if (!shortcutHelpItems) return;
  const ja = document.documentElement.lang !== 'en';
  const term = shortcutHelpSearch?.value.trim().toLowerCase() ?? '';
  shortcutHelpItems.replaceChildren();
  for (const [group,name,key] of shortcutHelpRows) {
    const local = ja ? shortcutHelpNames[name] ?? name : name;
    if (!`${name} ${local} ${key} ${group} ${shortcutHelpNames[group] ?? ''}`.toLowerCase().includes(term)) continue;
    const row = document.createElement('div'); row.className = 'shortcut-help-row';
    const label = document.createElement('span'); label.textContent = `${ja ? shortcutHelpNames[group] ?? group : group} · ${local}`;
    const kbd = document.createElement('kbd'); kbd.textContent = key;
    row.append(label,kbd); shortcutHelpItems.append(row);
  }
}
function openShortcutHelp() {
  if (!shortcutHelpDialog || shortcutHelpDialog.open) return;
  shortcutHelpSearch.value = '';
  renderShortcutHelp(); shortcutHelpDialog.showModal(); shortcutHelpSearch.focus();
}
document.getElementById('toolbarShortcutHelp')?.addEventListener('click',openShortcutHelp);
document.getElementById('shortcutHelpClose')?.addEventListener('click',()=>shortcutHelpDialog?.close());
shortcutHelpSearch?.addEventListener('input',renderShortcutHelp);
shortcutHelpDialog?.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
// Shortcuts remain discoverable on the existing action buttons.
for (const [id,key] of [['addBlankSlideButton','G'],['presentButton','P'],['undoEditorButton','Ctrl+Z'],['redoEditorButton','Ctrl+Y'],['previousSlideButton','←'],['nextSlideButton','→'],['fullscreenButton','T'],['screenshotButton','Y'],['recordSlideButton','R'],['presentationToolEraser','N'],['scene2uSelectionGizmo','M'],['presentationCameraButton','F'],['presentationSlideDrawButton','V / B']]) {
  const button=document.getElementById(id);
  if (!button) continue;
  button.dataset.shortcutKey=key;
  const refresh=()=>{button.title=`${button.textContent.trim()} (${key})`;};
  refresh();
  document.addEventListener('slidespace:language-changed',refresh);
  new MutationObserver(refresh).observe(button,{childList:true,characterData:true,subtree:true});
}
const keydownEvents = function (e) {
  if ((e.key === '?' || (e.key === '/' && e.shiftKey)) && !e.ctrlKey && !e.metaKey && !e.altKey &&
      !isEditableElement(e.target) && !document.querySelector('dialog[open]')) {
    e.preventDefault(); openShortcutHelp(); return;
  }
  if (isEditableElement(e.target)) {
    return;
  }
  if (isPresentationMode()) {
    handlePresentationKeydown(e);

    return;
  }

  // Improve-1B: G creates a blank slide; ignore repeats and active dialogs.
  if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'g' && !e.repeat &&
      !document.querySelector('dialog[open]')) {
    e.preventDefault();
    document.getElementById('addBlankSlideButton')?.click();
    return;
  }
  if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'm' && !e.repeat && !document.querySelector('dialog[open]')) {
    e.preventDefault();
    const kind = scene2uChooseActiveKind();
    const currentMode = kind === 'asset' ? assetGizmoMode : slideGizmoMode;
    const next = ({position:'rotation',rotation:'scale',scale:'off',off:'position'})[currentMode] ?? 'position';
    scene2uActivateGizmo(next,kind);
    return;
  }
  if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'p' && !e.repeat) {
    e.preventDefault();
    void enterPresentationMode();
    return;
  }
  const modifier = e.ctrlKey || e.metaKey;
  if (modifier) {
    return;
  }
  const cameraPos = camera.position;
  const cameraTarget = camera.target;
  const cameraForward = camera.getDirection(Vector3.Forward());
  const cameraBackward = camera.getDirection(Vector3.Backward());
  const cameraLeft = camera.getDirection(Vector3.Left());
  const cameraRight = camera.getDirection(Vector3.Right());
  const cameraUp = camera.getDirection(Vector3.Up());
  const cameraDown = camera.getDirection(Vector3.Down());
  let posX, posY, posZ;
  let tgtX, tgtY, tgtZ;
  switch (e.key) {
    case "n":
    case "N": // Toggle eraser; switch from brush without ending drawing mode.
      e.preventDefault();
      if (drawingController.isActive() && currentSlideDrawingTool === "eraser") {
        switchDrawing();
      } else if (!drawingController.isActive()) {
        drawingButton?.click();
        queueMicrotask(() => setSlideDrawingTool("eraser"));
      } else {
        setSlideDrawingTool("eraser");
      }
      break;
    case "y":
    case "Y": // スクリーンショットの保存
      saveScreenshot();
      break;
    case "b": // Neon brush: same key toggles off, other tool switches in place.
    case "B":
    case "v": // Standard brush: same key toggles off, other tool switches in place.
    case "V": {
      e.preventDefault();
      const neon = e.key.toLowerCase() === "b";
      const sameActiveBrush = drawingController.isActive() &&
        currentSlideDrawingTool === "brush" && layerSwitch.checked === neon;
      if (sameActiveBrush) {
        switchDrawing();
      } else {
        layerSwitch.checked = neon;
        setSlideDrawingTool("brush"); // N's eraser must not persist when switching to V/B.
        toggleActiveLayer();
        if (!drawingController.isActive()) switchDrawing();
      }
      break;
    }
    case "d": // カメラの位置を+x
    case "D":
      const right = camera.getDirection(Vector3.Right());
      camera.position.addInPlace(right.scale(cameraSpeed));
      cameraCurrentPosition = camera.position.clone();
      cameraEndPointPosition = camera.position.clone();
      cameraControlViaKeyboard = false;
      break;
    case "a": // カメラの位置を-x
    case "A":
      const left = camera.getDirection(Vector3.Left());
      camera.position.addInPlace(left.scale(cameraSpeed));
      cameraCurrentPosition = camera.position.clone();
      cameraEndPointPosition = camera.position.clone();
      cameraControlViaKeyboard = false;
      break;
    case "w": // カメラの位置を+y
    case "W":
      const up = camera.getDirection(Vector3.Up());
      camera.position.addInPlace(up.scale(cameraSpeed));
      cameraCurrentPosition = camera.position.clone();
      cameraEndPointPosition = camera.position.clone();
      cameraControlViaKeyboard = false;
      break;
    case "s": // カメラの位置を-y
    case "S":
      const down = camera.getDirection(Vector3.Down());
      camera.position.addInPlace(down.scale(cameraSpeed));
      cameraCurrentPosition = camera.position.clone();
      cameraEndPointPosition = camera.position.clone();
      cameraControlViaKeyboard = false;
      break;
    case "e": // カメラの位置を+z
    case "E":
      const forward = camera.getDirection(Vector3.Forward());
      camera.position.addInPlace(forward.scale(cameraSpeed));
      cameraCurrentPosition = camera.position.clone();
      cameraEndPointPosition = camera.position.clone();
      cameraControlViaKeyboard = false;
      break;
    case "q": // カメラの位置を-z
    case "Q":
      const backward = camera.getDirection(Vector3.Backward());
      camera.position.addInPlace(backward.scale(cameraSpeed));
      cameraCurrentPosition = camera.position.clone();
      cameraEndPointPosition = camera.position.clone();
      cameraControlViaKeyboard = false;
      break;
    case "j":
    case "J":
      rotateCameraLocal(-5 * cameraNavigationSettings.keyboardRotateSensitivity, 0, 0);
      break;
    case "l":
    case "L":
      rotateCameraLocal(5 * cameraNavigationSettings.keyboardRotateSensitivity, 0, 0);
      break;
    case "i":
    case "I":
      rotateCameraLocal(0, -5 * cameraNavigationSettings.keyboardRotateSensitivity, 0);
      break;
    case "k":
    case "K":
      rotateCameraLocal(0, 5 * cameraNavigationSettings.keyboardRotateSensitivity, 0);
      break;
    case "u":
    case "U":
      rotateCameraLocal(0, 0, -5 * cameraNavigationSettings.keyboardRotateSensitivity);
      break;
    case "o":
    case "O":
      rotateCameraLocal(0, 0, 5 * cameraNavigationSettings.keyboardRotateSensitivity);
      break;
    case "h": // カメラの位置を初期位置に
    case "H":
      currentSlideIndex = 0;
      currentSlide();
      break;
    case "ArrowLeft": // カメラの位置を前のスライドに
      if (e.altKey) {
        return;
      }
      previousSlide();
      break;
    case "z":
    case "Z":
      previousSlide();
      break;
    case "ArrowDown": // カメラの位置を現在のスライドに
      if (e.altKey) {
        return;
      }
      currentSlide();
      break;
    case "x":
    case "X":
      currentSlide();
      break;
    case "ArrowRight": // カメラの位置を次のスライドに
      if (e.altKey) {
        return;
      }
      nextSlide();
      break;
    case "c":
    case "C":
      nextSlide();
      break;
    case "r": // スライド情報の記録
    case "R":
      if (!isPresentationMode()) moveOnlyCurrentSlideInFrontOfCamera();
      break;
    case "f": // マウスによるカメラのコントロールの有無を切り替え
    case "F": // マウスによるカメラのコントロールの有無を切り替え
      switchCameraControl();
      break;
    case "t": // 全画面表示
    case "T": // 全画面表示
      toggleFullscreen();
      break;
  }
};

const setKeyboardEvents = function () {
  window.addEventListener("keydown", keydownEvents);
  window.addEventListener("keydown", async (event) => {
    // =====================================
    // Presentation Mode Exit
    // 最優先
    // =====================================

    if (event.key === "Escape" && isPresentationMode()) {
      event.preventDefault();

      // =====================================
      // Close Overview First
      // =====================================

      if (presentationOverviewOpen) {
        finishPresentationOverview();

        showPresentationControls({
          autoHide: false,
        });

        return;
      }

      // =====================================
      // Cancel Slide Jump Editing
      // =====================================

      if (presentationSlideJumpEditing) {
        endPresentationSlideJump();

        refreshPresentationControls();

        showPresentationControls({
          autoHide: false,
        });

        return;
      }

      // In presentation mode Escape first dismisses the active interaction.
      // A second press exits the presentation.
      if (drawingController.isActive()) {
        detachDrawings();
        updatePresentationDrawingButton();
        showPresentationControls({ autoHide: false });
        return;
      }
      if (cameraControlViaMouse) {
        stopPresentationCameraControl();
        showPresentationControls({ autoHide: false });
        return;
      }

      // =====================================
      // Exit Presentation
      // =====================================

      await exitPresentationMode();

      return;
    }

    if (isPresentationMode()) {
      return;
    }

    if (
      event.key === "Escape" &&
      slideContextMenu &&
      !slideContextMenu.hidden
    ) {
      event.preventDefault();

      closeSlideContextMenu();

      return;
    }

    // Drawing-7F3: Escape clears stroke selection before changing slide selection.
    // Do not hijack Escape from text inputs, selects or editable fields.
    if (event.key === "Escape" && drawingController?.isActive() &&
        !event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) {
      const screen = drawingController?.getScreenSelection?.();
      const slide = slideDrawing?.getSelection?.();
      const hasSelection = (Array.isArray(screen) ? screen.length > 0 : Boolean(screen?.count || screen?.index >= 0)) ||
                           (Array.isArray(slide) ? slide.length > 0 : Boolean(slide?.count || slide?.strokeId));
      if (hasSelection) {
        event.preventDefault();
        slideDrawing.clearSelection();
        drawingController.clearScreenSelection();
        updateDrawingSelectionButtons();
        return;
      }
    }

    // =========================
    // Escape
    // =========================

    if (event.key === "Escape") {
      setSingleSlideSelection(currentSlideIndex);

      renderSlideThumbnails();

      refreshSlideSelectionUi();

      return;
    }

    // =========================
    // isTextEditing?
    // =========================

    // Range sliders are focusable inputs, but Ctrl/Cmd+Z/Y should still
    // operate on SlideSpace history. Preserve native editing shortcuts for
    // text/number inputs, textareas, selects and contenteditable controls.
    const rangeHistoryShortcut =
      (event.target instanceof HTMLSelectElement || (event.target instanceof HTMLInputElement && ["range", "checkbox", "radio", "color"].includes(event.target.type))) &&
      (event.ctrlKey || event.metaKey) &&
      ["z", "y"].includes(event.key.toLowerCase());
    if (isEditableElement(event.target) && !rangeHistoryShortcut) {
      return;
    }

    // =========================
    // Alt + ← / → / Home / End
    // =========================

    if (
      event.altKey &&
      event.key === "ArrowLeft" &&
      selectedSlideIds.size > 0
    ) {
      event.preventDefault();

      await moveSlides("left");

      return;
    }

    if (
      event.altKey &&
      event.key === "ArrowRight" &&
      selectedSlideIds.size > 0
    ) {
      event.preventDefault();

      await moveSlides("right");

      return;
    }

    if (event.altKey && event.key === "Home" && selectedSlideIds.size > 0) {
      event.preventDefault();

      await moveSelectedSlidesToStart();

      return;
    }

    if (event.altKey && event.key === "End" && selectedSlideIds.size > 0) {
      event.preventDefault();

      await moveSelectedSlidesToEnd();

      return;
    }

    // =========================
    // Delete
    // =========================

    if (event.key === "Delete") {
      event.preventDefault();
      const screenSelected = drawingController?.getScreenSelection();
      const slideSelected = slideDrawing?.getSelection();
      if (screenSelected || slideSelected) {
        if (screenSelected) drawingController.deleteScreenSelection();
        else if (slideDrawing.deleteSelected()) { renderSlideThumbnails(); scheduleProjectStatusRefresh(); }
        updateDrawingSelectionButtons();
        uiSound.play();
        return;
      }
      await deleteSlides();

      return;
    }

    // =========================
    // Ctrl + キー
    // =========================

    const modifier = event.ctrlKey || event.metaKey;

    if (!modifier) {
      return;
    }

    // =========================
    // Undo
    // =========================

    if (event.key.toLowerCase() === "z" && !event.shiftKey) {
      event.preventDefault();
      undoEditorAction().catch((error) => {
        console.error("Undo failed:", error);
      });
      return;
    }

    // =========================
    // Redo
    // =========================

    if (
      event.key.toLowerCase() === "y" ||
      (event.key.toLowerCase() === "z" && event.shiftKey)
    ) {
      event.preventDefault();
      redoEditorAction().catch((error) => {
        console.error("Redo failed:", error);
      });
    }

    // =========================
    // Copy
    // =========================

    if (event.key.toLowerCase() === "c") {
      event.preventDefault();
      if (currentSlideDrawingTool === "select" && copyDrawingSelection()) return;

      copySlides();

      return;
    }

    // =========================
    // Paste
    // =========================

    if (event.key.toLowerCase() === "v") {
      event.preventDefault();
      if (drawingStrokeClipboard && currentSlideDrawingTool === "select" && pasteDrawingSelection()) return;

      await pasteCopiedSlides();

      return;
    }

    // =========================
    // All
    // =========================

    if (modifier && event.key.toLowerCase() === "a") {
      event.preventDefault();

      selectedSlideIds.clear();

      for (const slideState of slideStates) {
        selectedSlideIds.add(slideState.id);
      }

      renderSlideThumbnails();

      refreshSlideSelectionUi();

      return;
    }
  });
  window.addEventListener(
    "keydown",
    async (event) => {
      if (!isPresentationMode() || !presentationOverviewOpen) {
        return;
      }

      // Search入力中は
      // Arrowなどを普通のInput操作に使わせる
      if (event.target === presentationOverviewSearch) {
        return;
      }

      const handled = await handlePresentationOverviewKeydown(event);

      if (handled) {
        event.stopPropagation();
      }
    },
    true,
  );
};

const bindNumberInputEnter = function (inputElement, applyButton) {
  inputElement.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    applyButton.click();
  });
};

const bindEnterToButton = function (inputElement, buttonElement) {
  inputElement.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    buttonElement.click();
  });
};

// Presentation専用Keyboard
const handlePresentationKeydown = function (event) {
  if (presentationOverviewOpen) {
    return;
  }

  showPresentationHudTemporarily();

  const isHistoryKey = (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "z";
  const isRedoKey = (event.ctrlKey || event.metaKey) && !event.altKey && (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey));
  if (isHistoryKey || isRedoKey) {
    event.preventDefault();
    presentationDrawingStep(isRedoKey);
    return;
  }
  const modifier = event.ctrlKey || event.metaKey || event.altKey;

  if (modifier) {
    return;
  }

  switch (event.key) {
    // The Editor's camera shortcuts are also available during presentations.
    case "a": case "A": case "d": case "D":
    case "q": case "Q": case "w": case "W":
    case "s": case "S": case "e": case "E": {
      event.preventDefault();
      const directions = { a: Vector3.Left(), d: Vector3.Right(),
        w: Vector3.Up(), s: Vector3.Down(), e: Vector3.Forward(), q: Vector3.Backward() };
      const direction = camera.getDirection(directions[event.key.toLowerCase()]);
      camera.position.addInPlace(direction.scale(cameraSpeed));
      cameraCurrentPosition = camera.position.clone();
      cameraEndPointPosition = camera.position.clone();
      cameraControlViaKeyboard = false;
      break;
    }
    case "j": case "J": case "k": case "K":
    case "l": case "L": case "u": case "U":
    case "i": case "I": case "o": case "O": {
      event.preventDefault();
      const mapping = {j:[-5,0,0],l:[5,0,0],i:[0,-5,0],k:[0,5,0],u:[0,0,-5],o:[0,0,5]};
      rotateCameraLocal(...mapping[event.key.toLowerCase()].map(v => v * cameraNavigationSettings.keyboardRotateSensitivity));
      break;
    }
    case "f":
    case "F":
      event.preventDefault();
      presentationCameraButton?.click();
      break;
    case "b":
    case "B":
    case "v":
    case "V": {
      event.preventDefault();
      const neon = event.key.toLowerCase() === "b";
      const slideDrawingActive = drawingController.isActive() && drawingTargetSelect?.value === "slide";
      const sameActiveBrush = slideDrawingActive && currentSlideDrawingTool === "brush" &&
        layerSwitch.checked === neon;
      if (sameActiveBrush) {
        presentationSlideDrawButton?.click();
      } else {
        if (presentationBrushStyle) {
          presentationBrushStyle.value = neon ? "neon" : "standard";
          presentationBrushStyle.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          layerSwitch.checked = neon;
          toggleActiveLayer();
        }
        setSlideDrawingTool("brush"); // Exit eraser when selecting V or B.
        if (!slideDrawingActive) presentationSlideDrawButton?.click();
      }
      break;
    }
    case "y":
    case "Y":
      event.preventDefault();
      saveScreenshot();
      break;
    case "n":
    case "N": {
      event.preventDefault();
      const slideDrawingActive = drawingController.isActive() && drawingTargetSelect?.value === "slide";
      if (slideDrawingActive && currentSlideDrawingTool === "eraser") {
        presentationSlideDrawButton?.click();
      } else if (!slideDrawingActive) {
        presentationSlideDrawButton?.click();
        queueMicrotask(() => setSlideDrawingTool("eraser"));
      } else {
        setSlideDrawingTool("eraser");
      }
      break;
    }
    // =====================================
    // Previous
    // =====================================

    case "ArrowLeft":
    case "PageUp":
    case "z":
    case "Z":
      event.preventDefault();

      previousSlide();

      break;

    // =====================================
    // Next
    // =====================================

    case "ArrowRight":
    case "PageDown":
    case " ":
    case "Enter":
    case "c":
    case "C":
      event.preventDefault();

      nextSlide();

      break;

    // =====================================
    // Current
    // =====================================

    case "ArrowDown":
    case "x":
    case "X":
      event.preventDefault();

      currentSlide();

      break;

    // =====================================
    // Fullscreen
    // =====================================

    case "t":
    case "T":
      event.preventDefault();

      toggleFullscreen();

      break;
  }
};

// update
const update = function (scene) {
  deltaTime = Math.min(engine.getDeltaTime() / 1000, 0.05);

  // カメラ
  if (cameraControlViaKeyboard) {
    const posFlag =
      Vector3.DistanceSquared(cameraCurrentPosition, cameraEndPointPosition) <=
      0.00000001; // 距離がほぼゼロの時
    const rotDot = Math.abs(
      Quaternion.Dot(cameraCurrentRotation, cameraEndPointRotation),
    );
    const rotFlag = rotDot > 0.999999;

    if (posFlag && rotFlag) {
      cameraCurrentPosition = cameraEndPointPosition.clone();
      cameraCurrentRotation = cameraEndPointRotation.clone();
    } else {
      const timed = activeTransitionDuration !== null && transitionStartPosition && transitionStartRotation;
      if (timed) transitionElapsed += Math.max(0, engine.getDeltaTime() / 1000);
      const t = timed ? durationProgress(transitionElapsed, activeTransitionDuration)
        : Math.min(deltaTime * smoothSpeed, 1.0);
      cameraCurrentPosition = Vector3.Lerp(
        timed ? transitionStartPosition : cameraCurrentPosition,
        cameraEndPointPosition,
        t,
      );
      cameraCurrentRotation = Quaternion.Slerp(
        timed ? transitionStartRotation : cameraCurrentRotation,
        cameraEndPointRotation,
        t,
      ).normalize();
    }

    camera.position.copyFrom(cameraCurrentPosition);

    camera.rotationQuaternion = cameraCurrentRotation.clone();
  }

  // 情報表示用
  webglWorldPosX.innerHTML = cameraCurrentPosition.x.toFixed(1);
  webglWorldPosY.innerHTML = cameraCurrentPosition.y.toFixed(1);
  webglWorldPosZ.innerHTML = cameraCurrentPosition.z.toFixed(1);
  const cameraForward = camera.getDirection(Vector3.Forward());
  // const cameraBackward = camera.getDirection(Vector3.Backward());
  // const cameraLeft = camera.getDirection(Vector3.Left());
  const cameraRight = camera.getDirection(Vector3.Right());
  const cameraUp = camera.getDirection(Vector3.Up());
  // const cameraDown = camera.getDirection(Vector3.Down());
  webglWorldRightX.innerHTML = cameraRight.x.toFixed(2);
  webglWorldRightY.innerHTML = cameraRight.y.toFixed(2);
  webglWorldRightZ.innerHTML = cameraRight.z.toFixed(2);
  webglWorldForwardX.innerHTML = cameraForward.x.toFixed(2);
  webglWorldForwardY.innerHTML = cameraForward.y.toFixed(2);
  webglWorldForwardZ.innerHTML = cameraForward.z.toFixed(2);
  webglWorldUpX.innerHTML = cameraUp.x.toFixed(2);
  webglWorldUpY.innerHTML = cameraUp.y.toFixed(2);
  webglWorldUpZ.innerHTML = cameraUp.z.toFixed(2);
  const euler = camera.rotationQuaternion.toEulerAngles();
  const pitchDeg = (euler.x * 180) / Math.PI;
  const yawDeg = (euler.y * 180) / Math.PI;
  const rollDeg = (euler.z * 180) / Math.PI;
  webglWorldAngleX.innerHTML = pitchDeg.toFixed(1);
  webglWorldAngleY.innerHTML = yawDeg.toFixed(1);
  webglWorldAngleZ.innerHTML = rollDeg.toFixed(1);
};

// ==========================================
// 7. 実行文・イベントリスナー (Executions & Listeners)
// ==========================================
previousSlideButton.addEventListener("click", async () => {
  await previousSlide();
});

currentSlideButton.addEventListener("click", async (e) => {
  await currentSlide();
});

nextSlideButton.addEventListener("click", async () => {
  await nextSlide();
});

// Effects-1H: editable Scene atmosphere settings and active Scene playback.
function getEditingSceneAtmosphereSettings() {
  const preset = currentProjectData?.scenePresets?.[editingScenePresetName];
  return normalizeAtmosphereEffects(preset?.atmosphereEffects);
}
function getActiveSceneAtmosphereSettings() {
  const currentSlide = getCurrentSlideState();
  // Effects-1I: the current Slide's settings win only when explicitly enabled.
  if (currentSlide?.atmosphereOverrideEnabled === true &&
      (!activeScenePresetName || activeScenePresetName === (currentSlide.scenePreset ?? 'default'))) {
    return normalizeAtmosphereEffects(currentSlide.atmosphereOverride);
  }
  const sceneName = activeScenePresetName ?? currentSlide?.scenePreset ?? 'default';
  const preset = currentProjectData?.scenePresets?.[sceneName];
  return normalizeAtmosphereEffects(preset?.atmosphereEffects);
}
// Effects-1F: atmosphere sliders with numeric entry, 0.1 precision, and compass wind.
const atmosphereNumericKeys = ['density', 'size', 'speed', 'wind', 'windDirection', 'distance', 'foregroundRatio', 'foregroundSize', 'foregroundSpeed'];
function refreshAtmosphereEffectsUI() {
  const settings = getEditingSceneAtmosphereSettings();
  const select = document.getElementById('atmospherePreset');
  if (select) select.value = settings.preset;
  for (const key of atmosphereNumericKeys) {
    const suffix = key.charAt(0).toUpperCase() + key.slice(1);
    const slider = document.getElementById(`atmosphere${suffix}`);
    const number = document.getElementById(`atmosphere${suffix}Number`);
    if (slider) { slider.value = String(settings[key]); slider.disabled = settings.preset === 'off'; }
    // Do not overwrite partially typed numbers while a number field has focus.
    if (number) {
      if (document.activeElement !== number) number.value = String(settings[key]);
      number.disabled = settings.preset === 'off';
    }
  }
  const count = document.getElementById('atmosphereParticleCount');
  if (count) { count.value = String(settings.particles.length); count.disabled = settings.preset === 'off'; }
  for (let i = 1; i <= 4; i++) {
    const particle = settings.particles[i - 1];
    const row = document.getElementById(`atmosphereParticleRow${i}`);
    if (row) row.hidden = !particle;
    for (const [suffix, key] of [['Color', 'color'], ['Shape', 'shape'], ['Weight', 'weight']]) {
      const input = document.getElementById(`atmosphereParticle${i}${suffix}`);
      if (!input || !particle) continue;
      if (document.activeElement !== input || suffix !== 'Weight') input.value = String(particle[key]);
      input.disabled = settings.preset === 'off';
    }
  }
  refreshSlideAtmosphereEffectsUI();
  atmosphereEffectsController?.setSettings(getActiveSceneAtmosphereSettings());
}
function updateAtmosphereSetting(key, value) {
  const scenePreset = currentProjectData?.scenePresets?.[editingScenePresetName];
  if (!scenePreset || isPresentationMode()) return false;
  scenePreset.atmosphereEffects = normalizeAtmosphereEffects({
    ...scenePreset.atmosphereEffects, [key]: value
  });
  refreshAtmosphereEffectsUI();
  scheduleProjectStatusRefresh();
  return true;
}
document.getElementById('atmospherePreset')?.addEventListener('change', event => {
  const scenePreset = currentProjectData?.scenePresets?.[editingScenePresetName];
  if (!scenePreset || isPresentationMode()) return;
  scenePreset.atmosphereEffects = getAtmospherePresetSettings(event.currentTarget.value);
  refreshAtmosphereEffectsUI();
  scheduleProjectStatusRefresh();
  void uiSound.play();
});
for (const key of atmosphereNumericKeys) {
  const suffix = key.charAt(0).toUpperCase() + key.slice(1);
  const slider = document.getElementById(`atmosphere${suffix}`);
  const number = document.getElementById(`atmosphere${suffix}Number`);
  slider?.addEventListener('input', event => {
    const value = Number(event.currentTarget.value);
    if (Number.isFinite(value)) updateAtmosphereSetting(key, value);
  });
  const commit = () => {
    if (!number || !currentProjectData || isPresentationMode()) return;
    const value = Number(number.value);
    if (!number.value.trim() || !Number.isFinite(value)) {
      number.value = String(getEditingSceneAtmosphereSettings()[key]);
      return;
    }
    updateAtmosphereSetting(key, value);
    number.value = String(getEditingSceneAtmosphereSettings()[key]);
  };
  number?.addEventListener('change', commit);
  number?.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); number.blur(); }
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      number.value = String(getEditingSceneAtmosphereSettings()[key]);
      number.blur();
    }
  });
}
function updateAtmosphereParticle(index, key, value) {
  const scenePreset = currentProjectData?.scenePresets?.[editingScenePresetName];
  if (!scenePreset || isPresentationMode()) return false;
  const settings = getEditingSceneAtmosphereSettings();
  if (!settings.particles[index]) return false;
  settings.particles[index] = { ...settings.particles[index], [key]: value };
  scenePreset.atmosphereEffects = normalizeAtmosphereEffects(settings);
  refreshAtmosphereEffectsUI();
  scheduleProjectStatusRefresh();
  return true;
}
document.getElementById('atmosphereParticleCount')?.addEventListener('change', event => {
  const scenePreset = currentProjectData?.scenePresets?.[editingScenePresetName];
  if (!scenePreset || isPresentationMode()) return;
  const settings = getEditingSceneAtmosphereSettings();
  const count = Math.max(1, Math.min(4, Number(event.currentTarget.value) || 2));
  while (settings.particles.length < count) settings.particles.push({ color: '#ffffff', shape: 'soft-circle', weight: 20 });
  settings.particles.length = count;
  scenePreset.atmosphereEffects = normalizeAtmosphereEffects(settings);
  refreshAtmosphereEffectsUI();
  scheduleProjectStatusRefresh();
  void uiSound.play();
});
for (let i = 1; i <= 4; i++) {
  const index = i - 1;
  const color = document.getElementById(`atmosphereParticle${i}Color`);
  const shape = document.getElementById(`atmosphereParticle${i}Shape`);
  const weight = document.getElementById(`atmosphereParticle${i}Weight`);
  color?.addEventListener('input', event => updateAtmosphereParticle(index, 'color', event.currentTarget.value));
  shape?.addEventListener('change', event => {
    if (updateAtmosphereParticle(index, 'shape', event.currentTarget.value)) void uiSound.play();
  });
  weight?.addEventListener('change', event => {
    const raw = Number(event.currentTarget.value);
    if (Number.isFinite(raw) && event.currentTarget.value.trim()) updateAtmosphereParticle(index, 'weight', raw);
    else refreshAtmosphereEffectsUI();
  });
  weight?.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); weight.blur(); }
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      weight.value = String(getEditingSceneAtmosphereSettings().particles[index]?.weight ?? 0);
      weight.blur();
    }
  });
}

// Effects-1I: Slide-only override editor (shared particle model, independent controls).
function getCurrentSlideAtmosphereSettings() {
  const slide = getCurrentSlideState();
  const sceneSettings = normalizeAtmosphereEffects(currentProjectData?.scenePresets?.[slide?.scenePreset ?? 'default']?.atmosphereEffects);
  return slide?.atmosphereOverrideEnabled === true
    ? normalizeAtmosphereEffects(slide.atmosphereOverride)
    : sceneSettings;
}
function refreshSlideAtmosphereEffectsUI() {
  const slide = getCurrentSlideState();
  const checkbox = document.getElementById('slideAtmosphereOverrideEnabled');
  if (checkbox) { checkbox.checked = slide?.atmosphereOverrideEnabled === true; checkbox.disabled = !slide || isPresentationMode(); }
  const details = document.getElementById('slideAtmosphereCustomDetails');
  if (details) { details.hidden = false; details.disabled = !(slide?.atmosphereOverrideEnabled === true && !isPresentationMode()); }
  const clearButton = document.getElementById('slideAtmosphereClearButton');
  if (clearButton) clearButton.disabled = !slide || isPresentationMode() || !(slide.atmosphereOverrideEnabled || slide.atmosphereOverride);
  const settings = getCurrentSlideAtmosphereSettings();
  const editable = Boolean(slide?.atmosphereOverrideEnabled && !isPresentationMode());
  const presetSelect = document.getElementById('slideAtmospherePreset');
  if (presetSelect) { presetSelect.value = settings.preset; presetSelect.disabled = !editable; }
  for (const key of atmosphereNumericKeys) {
    const suffix = key.charAt(0).toUpperCase() + key.slice(1);
    const slider = document.getElementById(`slideAtmosphere${suffix}`);
    const number = document.getElementById(`slideAtmosphere${suffix}Number`);
    if (slider) { slider.value = String(settings[key]); slider.disabled = !editable || settings.preset === 'off'; }
    if (number) {
      if (document.activeElement !== number) number.value = String(settings[key]);
      number.disabled = !editable || settings.preset === 'off';
    }
  }
  const count = document.getElementById('slideAtmosphereParticleCount');
  if (count) { count.value = String(settings.particles.length); count.disabled = !editable || settings.preset === 'off'; }
  for (let i = 1; i <= 4; i++) {
    const variant = settings.particles[i-1];
    const row = document.getElementById(`slideAtmosphereParticleRow${i}`);
    if (row) row.hidden = !variant;
    for (const [suffix, key] of [['Color','color'], ['Shape','shape'], ['Weight','weight']]) {
      const input = document.getElementById(`slideAtmosphereParticle${i}${suffix}`);
      if (!input || !variant) continue;
      if (document.activeElement !== input || suffix !== 'Weight') input.value = String(variant[key]);
      input.disabled = !editable || settings.preset === 'off';
    }
  }
}
function updateSlideAtmosphereSettings(update) {
  const slide = getCurrentSlideState();
  if (!slide || slide.atmosphereOverrideEnabled !== true || isPresentationMode()) return false;
  slide.atmosphereOverride = normalizeAtmosphereEffects({ ...getCurrentSlideAtmosphereSettings(), ...update });
  refreshSlideAtmosphereEffectsUI();
  atmosphereEffectsController?.setSettings(getActiveSceneAtmosphereSettings());
  scheduleProjectStatusRefresh();
  return true;
}
document.getElementById('slideAtmosphereOverrideEnabled')?.addEventListener('change', event => {
  const slide = getCurrentSlideState();
  if (!slide || isPresentationMode()) return;
  if (event.currentTarget.checked) {
    if (!slide.atmosphereOverride) {
      slide.atmosphereOverride = normalizeAtmosphereEffects(currentProjectData?.scenePresets?.[slide.scenePreset ?? 'default']?.atmosphereEffects);
    }
    slide.atmosphereOverrideEnabled = true;
  } else {
    slide.atmosphereOverrideEnabled = false;
  }
  refreshSlideAtmosphereEffectsUI();
  atmosphereEffectsController?.setSettings(getActiveSceneAtmosphereSettings());
  scheduleProjectStatusRefresh();
  void uiSound.play();
});
document.getElementById('slideAtmosphereClearButton')?.addEventListener('click', () => {
  const slide = getCurrentSlideState();
  if (!slide || isPresentationMode()) return;
  const before = atmosphereHistorySnapshot('slide', slide.id);
  slide.atmosphereOverrideEnabled = false;
  slide.atmosphereOverride = null;
  recordAtmosphereHistory('slide', slide.id, before);
  refreshSlideAtmosphereEffectsUI();
  atmosphereEffectsController?.setSettings(getActiveSceneAtmosphereSettings());
  scheduleProjectStatusRefresh();
});
document.getElementById('slideAtmospherePreset')?.addEventListener('change', event => {
  if (updateSlideAtmosphereSettings(getAtmospherePresetSettings(event.currentTarget.value))) void uiSound.play();
});
for (const key of atmosphereNumericKeys) {
  const suffix = key.charAt(0).toUpperCase() + key.slice(1);
  const slider = document.getElementById(`slideAtmosphere${suffix}`);
  const number = document.getElementById(`slideAtmosphere${suffix}Number`);
  slider?.addEventListener('input', event => {
    const value = Number(event.currentTarget.value);
    if (Number.isFinite(value)) updateSlideAtmosphereSettings({ [key]: value });
  });
  const commit = () => {
    if (!number || !getCurrentSlideState()?.atmosphereOverrideEnabled || isPresentationMode()) return;
    const value = Number(number.value);
    if (!number.value.trim() || !Number.isFinite(value)) {
      number.value = String(getCurrentSlideAtmosphereSettings()[key]); return;
    }
    updateSlideAtmosphereSettings({ [key]: value });
    number.value = String(getCurrentSlideAtmosphereSettings()[key]);
  };
  number?.addEventListener('change', commit);
  number?.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); number.blur(); }
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      number.value = String(getCurrentSlideAtmosphereSettings()[key]); number.blur();
    }
  });
}
document.getElementById('slideAtmosphereParticleCount')?.addEventListener('change', event => {
  const settings = getCurrentSlideAtmosphereSettings();
  const count = Math.max(1, Math.min(4, Number(event.currentTarget.value) || 2));
  while (settings.particles.length < count) settings.particles.push({color:'#ffffff', shape:'soft-circle', weight:20});
  settings.particles.length = count;
  if (updateSlideAtmosphereSettings(settings)) void uiSound.play();
});
for (let i = 1; i <= 4; i++) {
  const index = i - 1;
  for (const [suffix, key, eventName] of [['Color','color','input'], ['Shape','shape','change'], ['Weight','weight','change']]) {
    const input = document.getElementById(`slideAtmosphereParticle${i}${suffix}`);
    input?.addEventListener(eventName, event => {
      const state = getCurrentSlideAtmosphereSettings();
      if (!state.particles[index]) return;
      const raw = event.currentTarget.value;
      const value = key === 'weight' ? Number(raw) : raw;
      if (key === 'weight' && (!raw.trim() || !Number.isFinite(value))) { refreshSlideAtmosphereEffectsUI(); return; }
      state.particles[index][key] = value;
      if (updateSlideAtmosphereSettings(state) && key === 'shape') void uiSound.play();
    });
    if (key === 'weight') input?.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); input.blur(); }
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        input.value = String(getCurrentSlideAtmosphereSettings().particles[index]?.weight ?? 0);
        input.blur();
      }
    });
  }
}

// Effects-1J: gesture-level history on the existing atmosphere controls.
// Existing input handlers own live rendering; this layer only captures the
// initial value, commits once per gesture, or rolls the gesture back on Esc.
function bindAtmosphereHistory(scope, element) {
  if (!element) return;
  let pending = null;
  let canceling = false;
  const begin = () => {
    if (canceling || pending || editorHistoryBusy || isPresentationMode()) return;
    const targetId = atmosphereHistoryTarget(scope);
    if (!targetId) return;
    const before = atmosphereHistorySnapshot(scope, targetId);
    if (before) pending = { targetId, before };
  };
  const commit = () => {
    if (!pending) return;
    const { targetId, before } = pending;
    pending = null;
    recordAtmosphereHistory(scope, targetId, before);
  };
  // Capture before an existing input/change listener mutates the model.
  element.addEventListener('focus', begin, true);
  element.addEventListener('pointerdown', begin, true);
  element.addEventListener('input', begin, true);
  element.addEventListener('change', begin, true);
  // change fires once when a range drag or color picker is committed.
  element.addEventListener('change', commit);
  element.addEventListener('blur', commit);
  element.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !pending) return;
    const { targetId, before } = pending;
    pending = null;
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    // blur may synthesize a final change on native number/color inputs.
    // Suppress history while that event is dispatched; restore AFTER blur.
    canceling = true;
    element.blur();
    applyAtmosphereHistoryState({ scope, targetId, before }, 'before');
    canceling = false;
  }, true);
}
function bindAtmosphereHistoryControls(scope, prefix) {
  const ids = [
    `${prefix}Preset`, `${prefix}ParticleCount`,
    ...(scope === 'slide' ? [`${prefix}OverrideEnabled`] : []),
    ...atmosphereNumericKeys.flatMap(key => {
      const suffix = key[0].toUpperCase() + key.slice(1);
      return [`${prefix}${suffix}`, `${prefix}${suffix}Number`];
    }),
    ...[1, 2, 3, 4].flatMap(index => ['Color', 'Shape', 'Weight'].map(
      suffix => `${prefix}Particle${index}${suffix}`)),
  ];
  for (const id of ids) bindAtmosphereHistory(scope, document.getElementById(id));
}
bindAtmosphereHistoryControls('scene', 'atmosphere');
bindAtmosphereHistoryControls('slide', 'slideAtmosphere');

// Camera-2A: project-wide projection shift; camera and slide poses are untouched.
function refreshCameraFramingOffsetUI() {
  const settings = normalizeCameraFramingOffset(currentProjectData?.cameraFramingOffset);
  for (const [axis, name] of [['horizontal', 'Horizontal'], ['vertical', 'Vertical']]) {
    const value = String(settings[axis]);
    const slider = document.getElementById(`cameraFraming${name}`);
    const number = document.getElementById(`cameraFraming${name}Number`);
    if (slider) slider.value = value;
    if (number) number.value = value;
  }
}
function applyCameraFramingOffset(settings) {
  if (!currentProjectData) return false;
  currentProjectData.cameraFramingOffset = normalizeCameraFramingOffset(settings);
  // Babylon caches the camera's combined view/projection matrix. Force a
  // refresh after changing the projection, without touching Camera Pose.
  if (camera && scene) {
    camera.getProjectionMatrix(true);
    scene.updateTransformMatrix(true);
  }
  refreshCameraFramingOffsetUI();
  scheduleProjectStatusRefresh();
  return true;
}
function recordCameraFramingOffsetChange(before) {
  const after = normalizeCameraFramingOffset(currentProjectData?.cameraFramingOffset);
  if (before.horizontal === after.horizontal && before.vertical === after.vertical) return;
  pushEditorHistory({ type: 'camera-framing-offset', before, after });
}
for (const [axis, name] of [['horizontal', 'Horizontal'], ['vertical', 'Vertical']]) {
  const slider = document.getElementById(`cameraFraming${name}`);
  const number = document.getElementById(`cameraFraming${name}Number`);
  let gestureBefore = null;
  const begin = () => { gestureBefore ??= normalizeCameraFramingOffset(currentProjectData?.cameraFramingOffset); };
  const update = input => {
    const raw = Number(input.value);
    if (!Number.isFinite(raw)) return;
    const next = { ...normalizeCameraFramingOffset(currentProjectData?.cameraFramingOffset), [axis]: raw };
    applyCameraFramingOffset(next);
  };
  const commit = input => {
    begin(); update(input);
    recordCameraFramingOffsetChange(gestureBefore);
    gestureBefore = null;
  };
  // Sliders commit at gesture end. Number spinners may fire change on every
  // increment, so they commit only on Enter or blur (like Slide Distance).
  slider?.addEventListener('focus', begin);
  slider?.addEventListener('pointerdown', begin);
  slider?.addEventListener('input', () => { begin(); update(slider); });
  slider?.addEventListener('change', () => commit(slider));
  number?.addEventListener('focus', begin);
  number?.addEventListener('pointerdown', begin);
  number?.addEventListener('input', () => { begin(); update(number); });
  number?.addEventListener('change', () => { begin(); update(number); });
  const cancel = (event, input) => {
    if (event.key !== 'Escape') return false;
    if (gestureBefore) applyCameraFramingOffset(gestureBefore);
    gestureBefore = null;
    event.preventDefault();
    event.stopPropagation();
    input.blur();
    return true;
  };
  slider?.addEventListener('keydown', event => cancel(event, slider));
  number?.addEventListener('keydown', event => {
    if (cancel(event, number)) return;
    if (event.key === 'Enter') { commit(number); number.blur(); event.preventDefault(); }
  });
  for (const input of [slider, number]) {
    input?.addEventListener('blur', () => {
      if (gestureBefore) { recordCameraFramingOffsetChange(gestureBefore); gestureBefore = null; }
    });
  }
}
document.getElementById('cameraFramingReset')?.addEventListener('click', () => {
  const before = normalizeCameraFramingOffset(currentProjectData?.cameraFramingOffset);
  applyCameraFramingOffset({ horizontal: 0, vertical: 0 });
  recordCameraFramingOffsetChange(before);
});

const cameraNavigationControlFields = [
  ["cameraKeyboardRotateSensitivity", "keyboardRotateSensitivity"],
  ['cameraRotateSensitivity', 'rotateSensitivity'],
  ['cameraPanSensitivity', 'panSensitivity'],
  ['cameraDollySensitivity', 'dollySensitivity'],
  ['cameraWheelSensitivity', 'wheelSensitivity'],
];
function updateCameraNavigationSettings(patch, playEffect = false) {
  cameraNavigationSettings = saveCameraNavigationSettings({...cameraNavigationSettings, ...patch});
  if (cameraNavigation) {
    cameraNavigation.setSettings(cameraNavigationSettings);
    cameraNavigation.setRotationMode(cameraNavigationSettings.rotationMode);
  }
  refreshCameraNavigationSettingsUI();
  if (playEffect) void uiSound.play();
}
function refreshCameraNavigationSettingsUI() {
  if (cameraRotationModeSelect) cameraRotationModeSelect.value = cameraNavigationSettings.rotationMode;
  for (const [id, key] of cameraNavigationControlFields) {
    const input = document.getElementById(id);
    if (input) input.value = String(cameraNavigationSettings[key]);
    const output = document.getElementById(`${id}Value`);
    if (output) output.textContent = `${cameraNavigationSettings[key].toFixed(1)}×`;
  }
  const invert = document.getElementById('cameraInvertY');
  if (invert) invert.checked = cameraNavigationSettings.invertY;
  for (const [id,key] of [['cameraInvertX','invertX'],['cameraInvertDolly','invertDolly'],['cameraInvertWheel','invertWheel']]) { const checkbox=document.getElementById(id); if(checkbox) checkbox.checked=cameraNavigationSettings[key]; }
  const mapping = document.getElementById('cameraMouseButtons');
  if (mapping) mapping.value = cameraNavigationSettings.middleButtonAction === 'dolly' ? 'swapped' : 'default';
}
cameraRotationModeSelect?.addEventListener('change', () => updateCameraNavigationSettings({rotationMode:cameraRotationModeSelect.value}, true));
for (const [id,key] of cameraNavigationControlFields) {
  const input = document.getElementById(id);
  input?.addEventListener('input', () => updateCameraNavigationSettings({[key]:Number(input.value)}));
  input?.addEventListener('change', () => void uiSound.play());
}
document.getElementById('cameraInvertY')?.addEventListener('change', event => updateCameraNavigationSettings({invertY:event.target.checked},true));
for (const [id,key] of [['cameraInvertX','invertX'],['cameraInvertDolly','invertDolly'],['cameraInvertWheel','invertWheel']]) document.getElementById(id)?.addEventListener('change', event => updateCameraNavigationSettings({[key]:event.target.checked},true));
document.getElementById('cameraMouseButtons')?.addEventListener('change', event => updateCameraNavigationSettings(event.target.value === 'swapped' ? {middleButtonAction:'dolly',rightButtonAction:'pan'} : {middleButtonAction:'pan',rightButtonAction:'dolly'},true));
document.getElementById('cameraNavigationReset')?.addEventListener('click', () => updateCameraNavigationSettings({...DEFAULT_CAMERA_NAVIGATION_SETTINGS},true));
refreshCameraNavigationSettingsUI();
cameraControlButton.addEventListener("click", () => {
  switchCameraControl();
});
// Drawing-7F: toolbar shortcuts delegate to the existing mode controllers.
const toolbarDrawingToggle = document.getElementById('toolbarDrawingToggle');
const toolbarCameraToggle = document.getElementById('toolbarCameraToggle');
toolbarDrawingToggle?.addEventListener('click', () => drawingButton.click());
toolbarCameraToggle?.addEventListener('click', () => cameraControlButton.click());
for (const [source, shortcut] of [[drawingButton, toolbarDrawingToggle], [cameraControlButton, toolbarCameraToggle]]) {
  if (!source || !shortcut) continue;
  const sync = () => {
    const active = source.classList.contains('active');
    shortcut.classList.toggle('active', active);
    shortcut.setAttribute('aria-pressed', String(active));
  };
  new MutationObserver(sync).observe(source, {attributes:true,attributeFilter:['class']});
  sync();
}

// Presentation Overlay
window.addEventListener("mousemove", () => {
  if (isPresentationMode()) {
    showPresentationHudTemporarily();
  }
});

// Presentation Controls
window.addEventListener("mousemove", (event) => {
  if (!isPresentationMode()) {
    return;
  }

  const distanceFromBottom = window.innerHeight - event.clientY;

  if (distanceFromBottom <= PRESENTATION_CONTROLS_EDGE_SIZE) {
    showPresentationControls();
  }
});

// キーボードによるカメラ移動スピードを変更するセレクトボックス
cameraSpeedSelector.addEventListener(
  "change",
  (e) => {
    cameraSpeed = Number(e.target.value);
  },
  false,
);

fullscreenButton.addEventListener("click", (e) => {
  toggleFullscreen();
});

screenshotButton.addEventListener("click", (e) => {
  saveScreenshot();
});

drawingController.bindEvents();

saveProjectButton.addEventListener("click", async () => {
  if (saveProjectButton.disabled) return;
  saveProjectButton.disabled = true;
  try {
    const directoryHandle = await ensureProjectDirectory();
    const savingScene = scene;
    if (projectName === "Untitled") {
      projectName = directoryHandle.name;
      currentProjectName.textContent = projectName;
    }
    const savedData = await saveProjectJsonToDirectory(directoryHandle);
    if (scene === savingScene) {
      projectStatus.markSaved(savedData);
      projectStatus.notice("保存しました");
    }
  } catch (error) {
    if (error.name === "AbortError") {
      projectStatus.notice("保存キャンセル");
      return;
    }
    console.error("Project save failed:", error);
    projectStatus.notice("保存失敗");
  } finally {
    saveProjectButton.disabled = false;
  }
});

recordSlideButton.addEventListener("click", async () => {
  try {
    moveOnlyCurrentSlideInFrontOfCamera();
  } catch (error) {
    console.error("Move current slide failed:", error);
    showAppNotice("Currentスライドの移動に失敗しました。", { level: "error" });
  }
});

document.getElementById("addTransparentSlideButton")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  if (button.disabled || projectOperationBusy || isPresentationMode()) return;
  button.disabled = true;
  try {
    await recordCurrentSlide({ blank: true, transparent: true, placement: document.getElementById("slideInsertPlacementSelect")?.value ?? "end" });
  } catch (error) {
    console.error("Transparent slide creation failed:", error);
    showAppNotice(t("Add transparent slide") + ": " + String(error?.message || error), {level:"error"});
  } finally { button.disabled = false; }
});

slideTransparentPresentationCheckbox?.addEventListener("change", () => {
  const slideState = getCurrentSlideState();
  if (!slideState || isPresentationMode() || editorHistoryBusy) return;
  const before = slideState.transparentInPresentation === true;
  const after = slideTransparentPresentationCheckbox.checked;
  if (before === after) return;
  slideState.transparentInPresentation = after;
  refreshTransparentSlideEditorMaterial(slideState);
  pushEditorHistory({type:"slide-transparency",slideId:slideState.id,before,after});
  scenePreviewUi.guidesSignature = null;
  refreshEditorVisualGuides();
  scheduleProjectStatusRefresh();
});

document.getElementById("addBlankSlideButton").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  if (button.disabled || projectOperationBusy || isPresentationMode()) return;
  button.disabled = true;
  try {
    await recordCurrentSlide({ blank: true, placement: document.getElementById("slideInsertPlacementSelect")?.value ?? "end" });
  } catch (error) {
    console.error("Blank slide creation failed:", error);
    showAppNotice("スライドの追加に失敗しました。", { level: "error" });
  } finally {
    button.disabled = false;
  }
});

scenePresetSelector.addEventListener("change", async () => {
  if (scenePreviewUi.previewName) await stopScenePreview();
  const name = scenePresetSelector.value;
  if (!currentProjectData?.scenePresets?.[name]) {
    refreshEditingScenePresetSelector();
    return;
  }

  // Select a slide which already uses this Scene. Do NOT change any slide's
  // scenePreset property merely by choosing an editing target.
  // Prefer the closest matching slide to avoid jumping unexpectedly far.
  const candidates = slideStates
    .map((state, index) => ({ index, name: resolveScenePreset(currentProjectData, state).name }))
    .filter(entry => entry.name === name);
  if (candidates.length) {
    const current = Math.max(0, currentSlideIndex);
    candidates.sort((a, b) => Math.abs(a.index - current) - Math.abs(b.index - current) || a.index - b.index);
    const target = candidates[0].index;
    await selectSlideByIndex(target);
    return;
  }

  // An unused Scene can still be edited, without making a slide or
  // changing Current. Scene-1U will add explicit creation/application UI.
  commitAssetTransformNumericEdit();
  editingScenePresetName = name;
  selectedSceneAssetId = null;
  environmentEditTarget = "preset";
  detachAssetGizmo();
  refreshEditingScenePresetSelector();
  refreshScenePresetBgmControls();
  refreshEnvironmentEditTargetUi();
  syncEnvironmentUi(getEnvironmentForEditorDisplay());
  syncSkyboxEditorFromEnvironment();
  refreshSceneAssetEditor();
  syncEditingSceneAssetGizmo();
});

clearEnvironmentOverrideButton.addEventListener("click", async () => {
  const slideState = getCurrentSlideState();

  if (!slideState) {
    return;
  }

  const settingsEdit = beginSettingsEdit();
  slideState.environmentOverride = {};
  finishSettingsEdit(settingsEdit);

  await applyCurrentEnvironment();

  environmentEditTarget = "override";

  refreshEnvironmentEditTargetUi();

  syncEnvironmentUi(getEnvironmentForEditorDisplay());

  refreshSlideSettingsInspector();

  renderTable();
});

document.getElementById('scene4cClearAssetSelection')?.addEventListener('click', () => {
  commitAssetTransformNumericEdit();
  scene4cAssetSelectionCleared = true;
  selectedSceneAssetId = null;
  canvasSelectedAssetIds.clear();
  scene2fClearAssetSelection();
  detachAssetGizmo();
  syncEditingSceneAssetGizmo();
  refreshSceneAssetEditor();
  scenePlacedAssetSelector.selectedIndex = -1;
  sceneAssetSelector.selectedIndex = -1;
});
scenePlacedAssetSelector.addEventListener("change", () => {
  if (!scenePlacedAssetSelector.value) return;
  commitAssetTransformNumericEdit();
  scene4cAssetSelectionCleared = false;
  selectedSceneAssetId = scenePlacedAssetSelector.value;
  canvasSelectedAssetIds.clear();
  canvasSelectedAssetIds.add(selectedSceneAssetId);
  scene2fSelectAsset(editingScenePresetName, selectedSceneAssetId);
  refreshSceneAssetEditor();
  syncEditingSceneAssetGizmo();
});

sceneAssetSelector.addEventListener("change", () => {
  // 編集中の数値入力履歴を確定
  commitAssetTransformNumericEdit();

  scene4cAssetSelectionCleared = false;
  selectedSceneAssetId = sceneAssetSelector.value;
  canvasSelectedAssetIds.clear();
  canvasSelectedAssetIds.add(selectedSceneAssetId);
  scene2fSelectAsset(editingScenePresetName, selectedSceneAssetId);

  refreshSceneAssetEditor();

  // Gizmoの接続を共通関数に任せる
  syncEditingSceneAssetGizmo();
});

resetAssetTransformButton.addEventListener("click", () => {
  const asset = getSelectedSceneAssetConfig();

  if (!asset) {
    return;
  }

  const before = cloneAssetTransform(ensureAssetTransform(asset));

  asset.transform = {
    position: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  };

  assetUniformScaleEnabled = true;
  applySelectedAssetTransform();
  refreshSceneAssetEditor();

  const after = cloneAssetTransform(ensureAssetTransform(asset));

  recordAssetTransformHistory(asset, before, after);
});

// Asset Δ operations use the existing Asset-transform undo history.
// Position offsets follow the same axes as the Asset Gizmo.
const beginAssetNumericRotationGroup = () => {
  const edit = scene2cBeginGroup();
  if (!edit) return null;
  edit.mode = 'rotation';
  if (selectedSlideIds.size && !edit.slides.length) {
    edit.slides = slideStates.filter(slide=>selectedSlideIds.has(slide.id)).map(slide=>({
      slideId:slide.id, before:createSlideTransformHistorySnapshot(slide),
    }));
  }
  return edit;
};
// Snapshot the whole cross-Scene selection before a numeric scale edit.
const scene2iBeginNumericAssetScale = () => {
  const edit = scene2cBeginGroup();
  if (!edit) return null;
  edit.mode = 'scale';
  if (selectedSlideIds.size && !edit.slides.length) {
    edit.slides = slideStates.filter(slide => selectedSlideIds.has(slide.id)).map(slide => ({
      slideId:slide.id, before:createSlideTransformHistorySnapshot(slide),
    }));
  }
  return edit;
};
const applyAssetAxisOperation = (group, axis, inputId) => {
  const asset = getSelectedSceneAssetConfig();
  if (!asset || !editingScenePresetName) return;
  const input = document.getElementById(inputId);
  const raw = input?.value.trim();
  const value = raw === "" ? NaN : Number(raw);
  if (!Number.isFinite(value)) { input?.focus(); return; }
  const before = cloneAssetTransform(ensureAssetTransform(asset));
  const groupRotation = group === 'rotation' ? beginAssetNumericRotationGroup() : group === 'scale' ? scene2iBeginNumericAssetScale() : null;
  const transform = ensureAssetTransform(asset);
  const axisIndex = { x: 0, y: 1, z: 2 }[axis.toLowerCase()];
  if (group === "position") {
    // Offsets are expressed in world axes unless local mode is selected.
    // Rotate a local displacement by the Asset's current orientation.
    let displacement = [0, 0, 0];
    displacement[axisIndex] = value;
    if (assetGizmoCoordinateMode === "local") {
      const v = new Vector3(...displacement);
      const q = quaternionFromArray(transform.rotation, [0, 0, 0, 1]);
      const matrix = Matrix.Compose(Vector3.One(), q, Vector3.Zero());
      const rotated = Vector3.TransformNormal(v, matrix);
      displacement = [rotated.x, rotated.y, rotated.z];
    }
    transform.position = transform.position.map((n, i) => Number(n) + displacement[i]);
  } else if (group === "rotation") {
    if (Math.abs(value) > 36000) return;
    transform.rotation = rotateAroundAxis(transform.rotation, axis.toLowerCase(), value, assetGizmoCoordinateMode);
  } else if (group === "scale") {
    if (value <= 0) return;
    const axes = assetUniformScaleEnabled ? [0, 1, 2] : [axisIndex];
    transform.scale = transform.scale.map((n, i) => axes.includes(i) ? Math.max(MIN_ASSET_SCALE, Number(n) * value) : Number(n));
  }
  applySelectedAssetTransform();
  refreshSelectedAssetTransformInputs();
  refreshAssetUniformScaleUi();
  if (groupRotation) {
    scene2cUpdateGroup(groupRotation);
    scene2cCommitGroup(groupRotation);
  } else {
    recordAssetTransformHistory(asset, before, cloneAssetTransform(ensureAssetTransform(asset)));
  }
};
for (const [group, axes] of [["position", ["X", "Y", "Z"]], ["rotation", ["Pitch", "Yaw", "Roll"]], ["scale", ["X", "Y", "Z"]]]) {
  for (const axis of axes) {
    const prefix = `asset${group[0].toUpperCase()}${group.slice(1)}Delta${axis}`;
    document.getElementById(`${prefix}Button`)?.addEventListener("click", () => applyAssetAxisOperation(group, axis, prefix));
  }
}
document.getElementById("assetScaleResetButton")?.addEventListener("click", () => {
  const asset = getSelectedSceneAssetConfig();
  if (!asset) return;
  const before = cloneAssetTransform(ensureAssetTransform(asset));
  const groupEdit = scene2iBeginNumericAssetScale();
  ensureAssetTransform(asset).scale = [1, 1, 1];
  assetUniformScaleEnabled = true;
  applySelectedAssetTransform();
  refreshSelectedAssetTransformInputs();
  refreshAssetUniformScaleUi();
  if (groupEdit) {
    scene2cUpdateGroup(groupEdit);
    scene2cCommitGroup(groupEdit);
  } else recordAssetTransformHistory(asset, before, cloneAssetTransform(ensureAssetTransform(asset)));
});

assetPositionX.addEventListener("input", updateSelectedAssetPosition);

assetPositionY.addEventListener("input", updateSelectedAssetPosition);

assetPositionZ.addEventListener("input", updateSelectedAssetPosition);

// Scene-2J: numeric Asset Scale is a real selection-wide transaction.
// Capture ALL selected transforms before the first input event. Preview every
// object on each input event; commit exactly once on change/blur.  Do not rely
// on `change` alone to propagate the scale (a source of missing group edits).
const scene2iScaleInputEdits = new Map();
const scene2jStartScaleInput = field => {
  const previous = scene2iScaleInputEdits.get(field);
  if (previous) return previous;
  const focused = getSelectedSceneAssetConfig();
  if (!focused) return null;
  const edit = {
    focused,
    before: cloneAssetTransform(ensureAssetTransform(focused)),
    group: scene2iBeginNumericAssetScale(),
  };
  scene2iScaleInputEdits.set(field, edit);
  return edit;
};
const scene2jPreviewScaleInput = field => {
  const edit = scene2jStartScaleInput(field);
  if (!edit || edit.focused !== getSelectedSceneAssetConfig()) return;
  if (field === assetUniformScaleInput) updateSelectedAssetUniformScale();
  else updateSelectedAssetScale();
  // Always propagate the live focused delta from the original snapshot.
  if (edit.group) scene2cUpdateGroup(edit.group);
  refreshCanvasSelectionHighlights();
};
const scene2jCommitScaleInput = field => {
  const edit = scene2iScaleInputEdits.get(field);
  if (!edit) return;
  scene2iScaleInputEdits.delete(field); // guard against blur + change double commits
  if (edit.focused !== getSelectedSceneAssetConfig() || !edit.before) return;
  if (edit.group) {
    scene2cUpdateGroup(edit.group);
    scene2cCommitGroup(edit.group);
  } else {
    recordAssetTransformHistory(edit.focused, edit.before,
      cloneAssetTransform(ensureAssetTransform(edit.focused)));
  }
  refreshSelectedAssetTransformInputs();
  refreshAssetUniformScaleUi();
  refreshCanvasSelectionHighlights();
};
const scene2jCancelScaleInput = field => {
  const edit = scene2iScaleInputEdits.get(field);
  if (!edit) return;
  scene2iScaleInputEdits.delete(field);
  if (edit.group) {
    // Revert every selected Asset/Slide without recording Undo history.
    void scene2cReplayGroup({
      presetName: edit.group.presetName,
      assets: edit.group.assets,
      slides: edit.group.slides,
    }, 'before');
  } else if (edit.focused) {
    edit.focused.transform = cloneAssetTransform(edit.before);
    applySelectedAssetTransform();
  }
  refreshSelectedAssetTransformInputs();
  refreshAssetUniformScaleUi();
};
for (const field of [assetScaleX, assetScaleY, assetScaleZ, assetUniformScaleInput]) {
  field.addEventListener('focus', () => scene2jStartScaleInput(field));
  field.addEventListener('input', () => scene2jPreviewScaleInput(field));
  field.addEventListener('change', () => scene2jCommitScaleInput(field));
  field.addEventListener('blur', () => scene2jCommitScaleInput(field));
  field.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); field.blur(); }
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      scene2jCancelScaleInput(field);
      field.blur();
    }
  });
}

assetRotationPitch.addEventListener("change", () => {
  const input = assetRotationPitch;
  const raw = input.value.trim();
  if (raw && Number.isFinite(Number(raw))) {
    const groupEdit = beginAssetNumericRotationGroup();
    updateAssetRotationAxisTarget("pitch", Number(raw));
    if (groupEdit) { scene2cUpdateGroup(groupEdit); scene2cCommitGroup(groupEdit); }
  }
  refreshSelectedAssetTransformInputs();
});
assetRotationPitch.addEventListener("keydown", event => {
  if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
  if (event.key === "Escape") { event.preventDefault(); refreshSelectedAssetTransformInputs(); event.currentTarget.blur(); }
});
const assetRotationPitchSlider = document.getElementById("assetRotationPitchSlider");
if (assetRotationPitchSlider) {
  let baseline = null;
  let groupEdit = null;
  let historyBefore = null;
  let gestureAsset = null;
  let startDegrees = 0;
  const begin = () => {
    const asset = getSelectedSceneAssetConfig();
    if (!asset) return;
    baseline = [...ensureAssetTransform(asset).rotation];
    historyBefore = cloneAssetTransform(ensureAssetTransform(asset));
    groupEdit = beginAssetNumericRotationGroup();
    gestureAsset = asset;
    startDegrees = getAssetEulerDegrees()?.pitch ?? 0;
  };
  assetRotationPitchSlider.addEventListener("pointerdown", begin);
  assetRotationPitchSlider.addEventListener("focus", () => { if (!baseline) begin(); });
  assetRotationPitchSlider.addEventListener("input", () => {
    const asset = getSelectedSceneAssetConfig();
    if (!asset) return;
    if (!baseline) begin();
    const transform = ensureAssetTransform(asset);
    transform.rotation = [...baseline];
    updateAssetRotationAxisTarget("pitch", Number(assetRotationPitchSlider.value), startDegrees);
    if (groupEdit) scene2cUpdateGroup(groupEdit);
    assetRotationPitch.value = assetRotationPitchSlider.value;
  });
  assetRotationPitchSlider.addEventListener("change", () => {
    if (groupEdit) scene2cCommitGroup(groupEdit);
    else if (gestureAsset && historyBefore) {
      recordAssetTransformHistory(gestureAsset, historyBefore, cloneAssetTransform(ensureAssetTransform(gestureAsset)));
    }
    groupEdit = null;
    baseline = null;
    historyBefore = null;
    gestureAsset = null;
    refreshSelectedAssetTransformInputs();
  });
  assetRotationPitchSlider.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation();
      const asset = getSelectedSceneAssetConfig();
      if (asset && baseline) { ensureAssetTransform(asset).rotation = [...baseline]; applySelectedAssetTransform(); }
      if (groupEdit) scene2cUpdateGroup(groupEdit);
      groupEdit = null;
      baseline = null; historyBefore = null; gestureAsset = null; event.currentTarget.blur(); refreshSelectedAssetTransformInputs();
    }
  });
}


assetRotationYaw.addEventListener("change", () => {
  const input = assetRotationYaw;
  const raw = input.value.trim();
  if (raw && Number.isFinite(Number(raw))) {
    const groupEdit = beginAssetNumericRotationGroup();
    updateAssetRotationAxisTarget("yaw", Number(raw));
    if (groupEdit) { scene2cUpdateGroup(groupEdit); scene2cCommitGroup(groupEdit); }
  }
  refreshSelectedAssetTransformInputs();
});
assetRotationYaw.addEventListener("keydown", event => {
  if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
  if (event.key === "Escape") { event.preventDefault(); refreshSelectedAssetTransformInputs(); event.currentTarget.blur(); }
});
const assetRotationYawSlider = document.getElementById("assetRotationYawSlider");
if (assetRotationYawSlider) {
  let baseline = null;
  let groupEdit = null;
  let historyBefore = null;
  let gestureAsset = null;
  let startDegrees = 0;
  const begin = () => {
    const asset = getSelectedSceneAssetConfig();
    if (!asset) return;
    baseline = [...ensureAssetTransform(asset).rotation];
    historyBefore = cloneAssetTransform(ensureAssetTransform(asset));
    groupEdit = beginAssetNumericRotationGroup();
    gestureAsset = asset;
    startDegrees = getAssetEulerDegrees()?.yaw ?? 0;
  };
  assetRotationYawSlider.addEventListener("pointerdown", begin);
  assetRotationYawSlider.addEventListener("focus", () => { if (!baseline) begin(); });
  assetRotationYawSlider.addEventListener("input", () => {
    const asset = getSelectedSceneAssetConfig();
    if (!asset) return;
    if (!baseline) begin();
    const transform = ensureAssetTransform(asset);
    transform.rotation = [...baseline];
    updateAssetRotationAxisTarget("yaw", Number(assetRotationYawSlider.value), startDegrees);
    if (groupEdit) scene2cUpdateGroup(groupEdit);
    assetRotationYaw.value = assetRotationYawSlider.value;
  });
  assetRotationYawSlider.addEventListener("change", () => {
    if (groupEdit) scene2cCommitGroup(groupEdit);
    else if (gestureAsset && historyBefore) {
      recordAssetTransformHistory(gestureAsset, historyBefore, cloneAssetTransform(ensureAssetTransform(gestureAsset)));
    }
    groupEdit = null;
    baseline = null;
    historyBefore = null;
    gestureAsset = null;
    refreshSelectedAssetTransformInputs();
  });
  assetRotationYawSlider.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation();
      const asset = getSelectedSceneAssetConfig();
      if (asset && baseline) { ensureAssetTransform(asset).rotation = [...baseline]; applySelectedAssetTransform(); }
      if (groupEdit) scene2cUpdateGroup(groupEdit);
      groupEdit = null;
      baseline = null; historyBefore = null; gestureAsset = null; event.currentTarget.blur(); refreshSelectedAssetTransformInputs();
    }
  });
}


assetRotationRoll.addEventListener("change", () => {
  const input = assetRotationRoll;
  const raw = input.value.trim();
  if (raw && Number.isFinite(Number(raw))) {
    const groupEdit = beginAssetNumericRotationGroup();
    updateAssetRotationAxisTarget("roll", Number(raw));
    if (groupEdit) { scene2cUpdateGroup(groupEdit); scene2cCommitGroup(groupEdit); }
  }
  refreshSelectedAssetTransformInputs();
});
assetRotationRoll.addEventListener("keydown", event => {
  if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
  if (event.key === "Escape") { event.preventDefault(); refreshSelectedAssetTransformInputs(); event.currentTarget.blur(); }
});
const assetRotationRollSlider = document.getElementById("assetRotationRollSlider");
if (assetRotationRollSlider) {
  let baseline = null;
  let groupEdit = null;
  let historyBefore = null;
  let gestureAsset = null;
  let startDegrees = 0;
  const begin = () => {
    const asset = getSelectedSceneAssetConfig();
    if (!asset) return;
    baseline = [...ensureAssetTransform(asset).rotation];
    historyBefore = cloneAssetTransform(ensureAssetTransform(asset));
    groupEdit = beginAssetNumericRotationGroup();
    gestureAsset = asset;
    startDegrees = getAssetEulerDegrees()?.roll ?? 0;
  };
  assetRotationRollSlider.addEventListener("pointerdown", begin);
  assetRotationRollSlider.addEventListener("focus", () => { if (!baseline) begin(); });
  assetRotationRollSlider.addEventListener("input", () => {
    const asset = getSelectedSceneAssetConfig();
    if (!asset) return;
    if (!baseline) begin();
    const transform = ensureAssetTransform(asset);
    transform.rotation = [...baseline];
    updateAssetRotationAxisTarget("roll", Number(assetRotationRollSlider.value), startDegrees);
    if (groupEdit) scene2cUpdateGroup(groupEdit);
    assetRotationRoll.value = assetRotationRollSlider.value;
  });
  assetRotationRollSlider.addEventListener("change", () => {
    if (groupEdit) scene2cCommitGroup(groupEdit);
    else if (gestureAsset && historyBefore) {
      recordAssetTransformHistory(gestureAsset, historyBefore, cloneAssetTransform(ensureAssetTransform(gestureAsset)));
    }
    groupEdit = null;
    baseline = null;
    historyBefore = null;
    gestureAsset = null;
    refreshSelectedAssetTransformInputs();
  });
  assetRotationRollSlider.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation();
      const asset = getSelectedSceneAssetConfig();
      if (asset && baseline) { ensureAssetTransform(asset).rotation = [...baseline]; applySelectedAssetTransform(); }
      if (groupEdit) scene2cUpdateGroup(groupEdit);
      groupEdit = null;
      baseline = null; historyBefore = null; gestureAsset = null; event.currentTarget.blur(); refreshSelectedAssetTransformInputs();
    }
  });
}


// Scene-3O: the same Glow checkbox edits Active Object or selected Assets.
// A blank Selection never falls back to the inspector's previously focused Asset.
function scene3oGlowTargets() {
  if (typeof scene3kScope === 'undefined') return [];
  if (scene3kScope === 'active') {
    const active = scene3cGetExplicitActive();
    return active?.kind === 'asset' ? [active] : [];
  }
  return scene2cGetGroupAssets().map(entry => ({kind:'asset',...entry}));
}
function scene3oSetAssetGlow(entry, glow) {
  entry.asset.glow = Boolean(glow);
  const loaded = getLoadedAssetByPresetAndId(entry.presetName, entry.asset.id);
  const layer = loaded?.ownerGlowLayer ?? (entry.presetName === editingScenePresetName ? activeGlowLayer : null);
  if (!layer) return;
  for (const mesh of loaded?.meshes ?? []) {
    if (!mesh) continue;
    if (glow) layer.removeExcludedMesh(mesh);
    else layer.addExcludedMesh(mesh);
  }
}
function scene3oRestoreGlowBatch(historyItem, phase) {
  let found = false;
  for (const item of historyItem.changes ?? []) {
    const asset = getScenePresetConfigByName(item.presetName)?.assets?.find(asset => asset.id === item.assetId);
    if (!asset) continue;
    scene3oSetAssetGlow({presetName:item.presetName,asset},item[phase]);
    found = true;
  }
  if (found) {refreshSelectedAssetTransformInputs();scene3oRefreshExtras();}
  return found;
}
function scene3oRefreshExtras() {
  if (!scene3oCameraExtras || !scene3oGlowExtras) return;
  const active = scene3kScope === 'active';
  const target = active ? scene3cGetExplicitActive() : null;
  const slides = active ? (target?.kind === 'slide' ? [target.slideState] : []) : getSelectedSlideEntries().filter(({slideState})=>!scene2oIsSlideHidden(slideState.id)).map(({slideState})=>slideState);
  const assets = scene3oGlowTargets();
  scene3oCameraExtras.hidden = !slides.length;
  scene3oGlowExtras.hidden = !assets.length;
  scene3oExtrasSummary.textContent = `${slides.length} ${t('Slides')} · ${assets.length} ${t('Assets')}`;
  // Keep the migrated camera editor in sync with the target scope.
  if (document.activeElement !== multiCameraDistanceInput &&
      document.activeElement !== cameraDistanceSlider) refreshMultiCameraControls();
  assetGlowCheck.disabled = !assets.length;
  if (assets.length) {
    const count = assets.filter(({asset})=>Boolean(asset.glow)).length;
    assetGlowCheck.indeterminate = count>0 && count<assets.length;
    assetGlowCheck.checked = count===assets.length;
  } else { assetGlowCheck.checked=false;assetGlowCheck.indeterminate=false; }
}
assetGlowCheck.addEventListener('change', () => {
  const targets=scene3oGlowTargets();
  if(!targets.length) return;
  const after=assetGlowCheck.checked;
  const changes=[];
  for(const entry of targets) {
    const before=Boolean(entry.asset.glow);
    if(before===after)continue;
    changes.push({presetName:entry.presetName,assetId:entry.asset.id,before,after});
    scene3oSetAssetGlow(entry,after);
  }
  if(changes.length)pushEditorHistory({type:'scene3o-glow-batch',changes});
  scene3oRefreshExtras();
});

// Scene-3V: selection owns the only interactive Gizmo controls. The two
// Babylon GizmoManagers remain as drag/Undo adapters, with coordinate and
// snapping settings driven directly by the shared inspector.
let scene2uLastActiveKind = 'slide';
const scene2uSelectionCount = document.getElementById('scene2uSelectionCount');
const scene2yActiveObjectSelect = document.getElementById('scene2yActiveObjectSelect');
const scene2vPivot = document.getElementById('scene2vPivot');
const scene2vAnchor = document.getElementById('scene2vAnchor');
const scene2vCoordinates = document.getElementById('scene2vCoordinates');
const scene2vSnapValue = document.getElementById('scene2vSnapValue');
slideTransformPivotSelect.value = 'individual';
assetTransformPivotSelect.value = 'individual';
const scene2vSyncControls = () => {
  const kind = scene2uChooseActiveKind() ?? 'slide';
  scene2vPivot.value = scene2wSelectionPivotMode;
  scene2vAnchor.value = scene2vGroupAnchor;
  scene2vCoordinates.value = kind === 'slide' ? slideGizmoCoordinateMode : assetGizmoCoordinateMode;
  const items = kind === 'slide' ? slideGizmoSnapOptions : assetGizmoSnapOptions;
  const mode = kind === 'slide' ? slideGizmoMode : assetGizmoMode;
  const normalized = mode === 'off' ? 'position' : mode;
  const values = items[normalized] ?? [];
  const offOption = document.createElement('option');
  offOption.value = 'off';
  offOption.textContent = t('No snap');
  scene2vSnapValue.replaceChildren(offOption, ...values.map(value => {
    const option = document.createElement('option'); option.value = String(value);
    option.textContent = normalized === 'rotation' ? `${value}°` : String(value);
    return option;
  }));
  const snapEnabled = kind === 'slide' ? slideGizmoSnapEnabled : assetGizmoSnapEnabled;
  scene2vSnapValue.value = snapEnabled
    ? String((kind === 'slide' ? slideGizmoSnapValues : assetGizmoSnapValues)[normalized])
    : 'off';
  scene2vSnapValue.disabled = mode === 'off';
  scene2vAnchor.disabled = scene2vPivot.value !== 'group';
};
document.addEventListener('slidespace:language-changed', scene2vSyncControls);
scene2vPivot.addEventListener('change',()=>{
  // A mixed Selection has exactly one pivot preference, independently of
  // which adapter currently owns the visible gizmo.
  scene2wSelectionPivotMode = scene2vPivot.value === 'individual' ? 'individual' : 'group';
  for (const legacy of [slideTransformPivotSelect,assetTransformPivotSelect]) {
    legacy.value = scene2wSelectionPivotMode;
    legacy.dispatchEvent(new Event('change', {bubbles:true}));
  }
  scene2vSyncControls();
  scene2xRefreshPivotAttachment();
});
scene2vAnchor.addEventListener('change',()=>{scene2vGroupAnchor = scene2vAnchor.value; scene2vSyncControls(); scene2xRefreshPivotAttachment();});
// Scene-3V: the shared inspector owns coordinate/snap changes. Update the
// two Babylon GizmoManager adapters directly; never click hidden legacy UI.
const scene3vSetCoordinates = mode => {
  const normalized = mode === 'local' ? 'local' : 'world';
  assetGizmoCoordinateMode = normalized;
  applyAssetGizmoCoordinateMode();
  refreshAssetGizmoCoordinateUi();
  setSlideRotationCoordinateModeFromUi(normalized);
  refreshSelectedAssetTransformInputs();
};
const scene3vSetSnap = rawValue => {
  const value = rawValue === 'off' ? null : Number(rawValue);
  // A valid shared snap value may belong to the active kind's gizmo mode
  // but not to the other kind. Do not overwrite an incompatible snap step.
  const normalized = value !== null && Number.isFinite(value) && value > 0 ? value : null;
  for (const kind of ['slide','asset']) {
    const mode = kind === 'slide' ? slideGizmoMode : assetGizmoMode;
    const effectiveMode = mode === 'off' ? 'position' : mode;
    const options = kind === 'slide' ? slideGizmoSnapOptions : assetGizmoSnapOptions;
    const values = kind === 'slide' ? slideGizmoSnapValues : assetGizmoSnapValues;
    if (normalized !== null && (options[effectiveMode] ?? []).some(n => Number(n) === normalized)) {
      values[effectiveMode] = normalized;
    }
  }
  slideGizmoSnapEnabled = normalized !== null;
  assetGizmoSnapEnabled = normalized !== null;
  applySlideGizmoSnap();
  applyAssetGizmoSnap();
  refreshSlideGizmoSnapUi();
  refreshAssetGizmoSnapUi();
};
scene2vCoordinates.addEventListener('change', () => {
  scene3vSetCoordinates(scene2vCoordinates.value);
  scene2vSyncControls();
  scene2xRefreshPivotAttachment();
});
scene2vSnapValue.addEventListener('change', () => {
  scene3vSetSnap(scene2vSnapValue.value);
  scene2vSyncControls();
});
// Scene-2V: explicit selection-only numeric translation. One history item
// covers all scenes, Slides and Assets; inspector focus / Current are ignored.
// Scene-3U: Selection relative operations accept numeric XYZ arrays directly.
// No invisible Scene-2V/3J input fields or synthetic click handlers remain.
const scene3jReportRelativeError = key => scene3kSetError(key);
const scene2vApplyTranslation = requestedNumbers => {
  if (!isEditorMode() || scenePreviewUi.previewName) return false;
  const numbers = requestedNumbers;
  if (!Array.isArray(numbers) || numbers.length!==3 || numbers.some(n=>!Number.isFinite(n))) { scene3jReportRelativeError('Enter valid relative transform numbers'); return false; }
  scene3jReportRelativeError(null);
  if (numbers.every(n=>Math.abs(n)<1e-10)) return false;
  const delta = Vector3.FromArray(numbers);
  const changes = {assets:[],slides:[]};
  for (const {presetName,asset} of scene2cGetGroupAssets()) {
    const before = cloneAssetTransform(ensureAssetTransform(asset));
    const next = cloneAssetTransform(before);
    next.position = Vector3.FromArray(before.position).add(delta).asArray();
    asset.transform = next;
    const loaded = getLoadedAssetByPresetAndId(presetName,asset.id);
    if (loaded?.rootNode) { applyAssetTransform(loaded.rootNode,asset); loaded.rootNode.computeWorldMatrix(true); }
    changes.assets.push({presetName,assetId:asset.id,before,after:cloneAssetTransform(next)});
  }
  for (const {slideState} of getSelectedSlideEntries()) {
    if (scene2oIsSlideHidden(slideState.id)) continue;
    const before = createSlideTransformHistorySnapshot(slideState);
    slideState.position = before.position.add(delta);
    slideState.cameraPosition = before.cameraPosition.add(delta);
    applySlideTransformStateToMesh(slideState);
    changes.slides.push({slideId:slideState.id,before,after:createSlideTransformHistorySnapshot(slideState)});
  }
  if (!changes.assets.length && !changes.slides.length) return false;
  pushEditorHistory({type:'scene2c-group-transform',presetName:editingScenePresetName,...changes});
  refreshSharedTransformControls();
  refreshSelectedAssetTransformInputs();
  renderTable();
  return true;
};
// Scene-2V: Rotate/Scale numeric operations share one selection snapshot and
// history transaction. These controls deliberately never fall back to Current.
const scene2vApplySelectionNumeric = (operation, requestedValues, requestedUniform = false) => {
  if (!isEditorMode() || scenePreviewUi.previewName) return false;
  const assets = scene2cGetGroupAssets().map(({presetName,asset})=>({
    presetName,asset, before:cloneAssetTransform(ensureAssetTransform(asset)),
  }));
  const slides = getSelectedSlideEntries()
    .filter(({slideState})=>!scene2oIsSlideHidden(slideState.id))
    .map(({slideState})=>({slideState,before:createSlideTransformHistorySnapshot(slideState)}));
  if (!assets.length && !slides.length) return false;
  scene3jReportRelativeError(null);
  if (!Array.isArray(requestedValues) || requestedValues.length!==3) {scene3jReportRelativeError('Enter valid relative transform numbers');return false;}
  const factors=operation==='scale' ? [...requestedValues] : [1,1,1];
  if (requestedUniform) factors.fill(factors[0]);
  const degrees=operation==='rotation' ? [...requestedValues] : [0,0,0];
  if (operation === 'scale' && factors.some(x=>!Number.isFinite(x)||x<=0)) {scene3jReportRelativeError('Scale factors must be positive');return false;}
  if (operation === 'rotation' && degrees.some(x=>!Number.isFinite(x))) {scene3jReportRelativeError('Enter valid relative transform numbers');return false;}
  if (operation === 'scale' && factors.every(x=>Math.abs(x-1)<1e-9)) return false;
  if (operation === 'rotation' && degrees.every(x=>Math.abs(x)<1e-9)) return false;
  const allPositions = [...assets.map(x=>x.before.position),...slides.map(x=>x.before.position)];
  const activeKind = scene2uChooseActiveKind();
  const activeAsset = assets.find(x=>x.asset.id===getSelectedSceneAssetConfig()?.id && x.presetName===editingScenePresetName);
  const activeSlide = slides.find(x=>x.slideState === getSlideGizmoTargetEntry()?.slideState);
  const active = activeKind==='asset' ? (activeAsset ?? assets[0] ?? slides[0]) : (activeSlide ?? slides[0] ?? assets[0]);
  const activePosition = active?.before.position;
  const pivot = scene2vGroupAnchor==='center'
    ? scene2vAveragePosition(allPositions)
    : Vector3.FromArray(Array.isArray(activePosition)?activePosition:activePosition.asArray());
  const pivotMode = scene2vPivot.value;
  let qDelta = null;
  if (operation === 'rotation') {
    // Apply X, Y, Z deltas in that order, with World or Active-Local axes.
    const localBasis = Array.isArray(active?.before.rotation)
      ? quaternionFromArray(active.before.rotation,[0,0,0,1])
      : active?.before.rotationQuaternion?.clone() ?? Quaternion.Identity();
    qDelta = Quaternion.Identity();
    for (let axis=0;axis<3;axis++) {
      if (Math.abs(degrees[axis])<1e-12) continue;
      const basis=[Vector3.Right(),Vector3.Up(),Vector3.Forward()][axis];
      if(scene2vCoordinates.value==='local') basis.applyRotationQuaternion(localBasis);
      qDelta=Quaternion.RotationAxis(basis.normalize(),degrees[axis]*Math.PI/180).multiply(qDelta).normalize();
    }
  }
  const history = {assets:[],slides:[]};
  const newPosition = (old) => {
    const p = Vector3.FromArray(Array.isArray(old)?old:old.asArray());
    if (pivotMode==='individual') return p;
    if (operation==='rotation') return pivot.add(p.subtract(pivot).applyRotationQuaternion(qDelta));
    const offset=p.subtract(pivot);
    // Local scaling is relative to the active object's coordinate frame.
    const basis=Array.isArray(active?.before.rotation)
      ? quaternionFromArray(active.before.rotation,[0,0,0,1])
      : active?.before.rotationQuaternion?.clone() ?? Quaternion.Identity();
    if (scene2vCoordinates.value==='local') offset.applyRotationQuaternion(basis.clone().conjugate());
    offset.multiplyInPlace(Vector3.FromArray(factors));
    if (scene2vCoordinates.value==='local') offset.applyRotationQuaternion(basis);
    return pivot.add(offset);
  };
  for (const {presetName,asset,before} of assets) {
    const next = cloneAssetTransform(before);
    next.position = newPosition(before.position).asArray();
    if (operation==='rotation') next.rotation = quaternionToArray(qDelta.multiply(quaternionFromArray(before.rotation,[0,0,0,1])).normalize());
    else next.scale = before.scale.map((n,i)=>n*factors[i]);
    asset.transform=next;
    const loaded=getLoadedAssetByPresetAndId(presetName,asset.id);
    if (loaded?.rootNode) {applyAssetTransform(loaded.rootNode,asset);loaded.rootNode.computeWorldMatrix(true);}
    history.assets.push({presetName,assetId:asset.id,before,after:cloneAssetTransform(next)});
  }
  for (const {slideState,before} of slides) {
    slideState.position=newPosition(before.position);
    if (operation==='rotation') {
      slideState.rotationQuaternion=qDelta.multiply(before.rotationQuaternion).normalize();
      syncCameraPoseAfterSlideTransform(slideState,before);
    } else {
      const oldScale=normalizeSlideScale(before.slideScale);
      slideState.slideScale={x:oldScale.x*factors[0],y:oldScale.y*factors[1],z:oldScale.z*factors[2]};
      slideState.cameraPosition=Vector3.FromArray(followSlideTranslation(before.cameraPosition.asArray(),before.position.asArray(),slideState.position.asArray()));
    }
    applySlideTransformStateToMesh(slideState);
    history.slides.push({slideId:slideState.id,before,after:createSlideTransformHistorySnapshot(slideState)});
  }
  pushEditorHistory({type:'scene2c-group-transform',presetName:editingScenePresetName,...history});
  refreshSharedTransformControls();
  refreshSelectedAssetTransformInputs();
  renderTable();
  return true;
};
// Scene-3U: Selection status is owned by the unified Scene-3K editor.
const scene3jSyncRelative = () => {
  if (typeof scene3kQueueSync === 'function') scene3kQueueSync();
};
// Scene-3C: the Active Object absolute editor deliberately targets exactly one
// explicitly selected entity. It never substitutes Current or an inspector-only asset.
// Scene-3T: retired the hidden Scene-3C/3D/3E absolute editor DOM and its
// nudge, slider, and Apply event handlers. The unified Scene-3K editor is the
// only input surface; the absolute transform engine below accepts XYZ values.
let scene3tActiveAbsoluteScaleLinked = true;
// Preserve the Scene identity of selected Assets, even in All Scenes view.
const scene2yAssetFocusValue = (presetName, assetId) =>
  `asset:${encodeURIComponent(presetName)}|${encodeURIComponent(assetId)}`;
const scene2yParseAssetFocusValue = value => {
  if (!value?.startsWith('asset:')) return null;
  const rest = value.slice(6);
  const separator = rest.indexOf('|');
  if (separator < 0) return {presetName:editingScenePresetName,id:rest}; // legacy UI value
  try { return {presetName:decodeURIComponent(rest.slice(0,separator)),id:decodeURIComponent(rest.slice(separator+1))}; }
  catch { return null; }
};
const scene3cGetExplicitActive = () => {
  const value=scene2yActiveObjectSelect.value;
  if (!value || scene2yActiveObjectSelect.disabled) return null;
  if (value.startsWith('slide:')) {
    const id=value.slice(6);
    const entry=getSelectedSlideEntries().find(x=>String(x.slideState.id)===id && !scene2oIsSlideHidden(x.slideState.id));
    return entry ? {kind:'slide',slideState:entry.slideState} : null;
  }
  if (value.startsWith('asset:')) {
    const focus=scene2yParseAssetFocusValue(value);
    const entry=scene2cGetGroupAssets().find(x=>focus && x.presetName===focus.presetName && String(x.asset.id)===String(focus.id));
    return entry ? {kind:'asset',...entry} : null;
  }
  return null;
};
const scene3cReadAbsolute = target => {
  if(!target) return null;
  if(target.kind==='slide') {
    const slide=target.slideState;
    const angles=slide.rotationQuaternion.toEulerAngles();
    const scale=normalizeSlideScale(slide.slideScale);
    return {position:slide.position.asArray(),rotation:[angles.x,angles.y,angles.z].map(radToDeg),scale:[scale.x,scale.y,scale.z]};
  }
  const t=ensureAssetTransform(target.asset);
  const angles=quaternionFromArray(t.rotation,[0,0,0,1]).toEulerAngles();
  return {position:t.position.slice(),rotation:[angles.x,angles.y,angles.z].map(radToDeg),scale:t.scale.slice()};
};
// Kept as a refresh hook for Gizmo drag / Undo/Redo / selection changes.
// No hidden absolute numeric inputs need to be synchronized anymore.
const scene3cRefreshAbsolute = () => {
  if (typeof scene3kQueueSync === 'function') scene3kQueueSync();
};
const scene3cApplyAbsolute = (mode,{recordHistory=true,requestedValues=null,linkedScale=null,linkedAxis=null}={}) => {
  if(!isEditorMode() || scenePreviewUi.previewName) return false;
  const target=scene3cGetExplicitActive();
  if(!target) return false;
  // Scene-3T: only the visible common editor provides requested XYZ values.
  const values=Array.isArray(requestedValues) ? [...requestedValues] : null;
  if(!values || values.length!==3 || values.some(value=>!Number.isFinite(value))) {
    scene3kSetError('Enter valid numbers for X, Y and Z');return false;
  }
  if(mode==='scale' && values.some(value=>value<=0)) {
    scene3kSetError('Scale values must be greater than zero');return false;
  }
  const previous=scene3cReadAbsolute(target)[mode];
  if(mode==='scale' && (linkedScale ?? scene3tActiveAbsoluteScaleLinked)) {
    // The visible editor passes the edited axis; preserve the prior XYZ ratios.
    const changed=previous.map((value,i)=>Math.abs(value-values[i])>1e-7?i:-1).filter(i=>i>=0);
    const axis=linkedAxis!==null && changed.includes(linkedAxis) ? linkedAxis : changed[0];
    if(axis!==undefined && axis>=0 && previous[axis]>0) {
      const linked=linkedAbsoluteScale(previous,values,axis);
      if(linked) linked.forEach((value,i)=>{values[i]=value;});
    }
  }
  if(previous.every((value,i)=>Math.abs(value-values[i])<1e-7)) return false;
  const history={type:'scene2c-group-transform',presetName:editingScenePresetName,assets:[],slides:[]};
  if(target.kind==='slide') {
    const slide=target.slideState;
    const before=createSlideTransformHistorySnapshot(slide);
    if(mode==='position') {
      const delta=Vector3.FromArray(values).subtract(before.position);
      slide.position=Vector3.FromArray(values);
      slide.cameraPosition=before.cameraPosition.add(delta);
    } else if(mode==='rotation') {
      slide.rotationQuaternion=Quaternion.FromEulerAngles(...values.map(deg=>deg*Math.PI/180));
      syncCameraPoseAfterSlideTransform(slide,before);
    } else slide.slideScale={x:values[0],y:values[1],z:values[2]};
    applySlideTransformStateToMesh(slide);
    history.slides.push({slideId:slide.id,before,after:createSlideTransformHistorySnapshot(slide)});
  } else {
    const {asset,presetName}=target;
    const before=cloneAssetTransform(ensureAssetTransform(asset));
    const next=cloneAssetTransform(before);
    if(mode==='position') next.position=values;
    else if(mode==='rotation') next.rotation=quaternionToArray(Quaternion.FromEulerAngles(...values.map(deg=>deg*Math.PI/180)));
    else next.scale=values;
    asset.transform=next;
    const loaded=getLoadedAssetByPresetAndId(presetName,asset.id);
    if(loaded?.rootNode){applyAssetTransform(loaded.rootNode,asset);loaded.rootNode.computeWorldMatrix(true);}
    history.assets.push({presetName,assetId:asset.id,before,after:cloneAssetTransform(next)});
  }
  if(recordHistory) pushEditorHistory(history);
  refreshSharedTransformControls();
  refreshSelectedAssetTransformInputs();
  renderTable();
  scene3cRefreshAbsolute();
  return true;
};
// Scene-3T: legacy absolute input/nudge/slider listeners are removed.
// Common-editor sliders and nudges already dispatch through scene3kApply().
const scene2uButtons = {
  position: document.getElementById('scene2uMoveButton'),
  rotation: document.getElementById('scene2uRotateButton'),
  scale: document.getElementById('scene2uScaleButton'),
  off: document.getElementById('scene2uOffButton'),
};
// Scene-4K: the explicit focus (when valid) is authoritative for Gizmo kind.
// A requested type never silently picks an object of the opposite type.
const scene2uChooseActiveKind = () => {
  // A single, mixed Slide/Asset picker is the sole authority for Gizmo kind.
  const focused = scene3cGetExplicitActive();
  if (focused) return focused.kind;
  const assets = scene2cGetGroupAssets();
  const slides = getSelectedSlideEntries().filter(entry => !scene2oIsSlideHidden(entry.slideState.id));
  if (scene2uLastActiveKind === 'asset' && assets.length) return 'asset';
  if (scene2uLastActiveKind === 'slide' && slides.length) return 'slide';
  return assets.length ? 'asset' : slides.length ? 'slide' : null;
};
// Scene-2Y: select a *focus*, not a new selection. Asset choices are scoped
// to the editing Scene so the existing per-Scene inspector remains coherent.
// Cross-Scene selections still participate in Group / Selection Center edits.
const scene2yRefreshActiveChoices = (slides, assets) => {
  const chosenSlide = slides.find(({slideState}) => String(slideState.id) === String(scene2yActiveSlideId));
  if (scene2yActiveSlideId && !chosenSlide) scene2yActiveSlideId = null;
  const focusedAsset = assets.find(({presetName,asset}) =>
    presetName === editingScenePresetName && asset.id === selectedSceneAssetId);
  const options = [];
  for (const {slideState,index} of slides) {
    options.push({value:`slide:${slideState.id}`,label:`${t('Slide')} ${index+1} — ${slideState.label || ''}`});
  }
  for (const {presetName,asset} of assets) {
    options.push({value:scene2yAssetFocusValue(presetName,asset.id),label:`${t('Asset')} — ${placedAssetDisplay(asset,currentProjectData?.assetLibrary)}${presetName !== editingScenePresetName ? ` (${presetName})` : ''}`});
  }
  // Keep Slide and Asset candidates together; no separate type selector.
  const visibleOptions = options;
  const old = scene2yActiveObjectSelect.value;
  scene2yActiveObjectSelect.replaceChildren(...visibleOptions.map(({value,label})=>{
    const option=document.createElement('option');
    option.value=value;option.textContent=label;
    return option;
  }));
  const activeKind = scene2uChooseActiveKind();
  const focusedSlide = chosenSlide ?? slides.find(({slideState}) =>
    slideState.id === getCurrentSlideState()?.id) ?? slides[0];
  const slideValue = focusedSlide ? `slide:${focusedSlide.slideState.id}` : '';
  const assetValue = focusedAsset ? scene2yAssetFocusValue(focusedAsset.presetName,focusedAsset.asset.id) : '';
  const preferred = activeKind === 'slide'
    ? (slideValue || assetValue) : (assetValue || slideValue);
  // Reflect the real focused target, not merely the prior dropdown value.
  // Explicit Slide focus is retained while the Slide remains selected.
  // Scene-4G: Active Object is a focus, not a side effect of Current or
  // the last refreshed Workspace. Keep the explicit focus while it remains
  // in the selection; only fall back when that target is no longer valid.
  const defaultValue = chooseFocusedTransformTarget({
    options: visibleOptions.map(o => o.value), previous: old, preferred,
    keepPrevious: true,
  });
  scene2yActiveObjectSelect.value = defaultValue;
  scene2yActiveObjectSelect.disabled = visibleOptions.length===0;
};
const scene2uRefreshSelectionGizmo = () => {
  const assets = scene2cGetGroupAssets();
  const slides = getSelectedSlideEntries().filter(entry => !scene2oIsSlideHidden(entry.slideState.id));
  const count = slides.length + assets.length;
  scene2yRefreshActiveChoices(slides,assets);
  const kind = scene2uChooseActiveKind();
  scene3cRefreshAbsolute();
  scene2uSelectionCount.textContent = `${count} selected (${slides.length} Slides, ${assets.length} Assets)`;
  scene3jSyncRelative();
  scene2vSyncControls();
  for (const [mode,button] of Object.entries(scene2uButtons)) {
    button.disabled = mode !== 'off' && (!kind || !isEditorMode() || scenePreviewUi.previewName || (kind === 'slide' && scenePreviewUi.hideSlideObjects) || (kind === 'asset' && scenePreviewUi.hideAssets));
    button.classList.toggle('active', mode === 'off' ? slideGizmoMode === 'off' && assetGizmoMode === 'off'
      : kind === 'slide' ? slideGizmoMode === mode : kind === 'asset' && assetGizmoMode === mode);
  }
};
const scene2uActivateGizmo = (mode,kind = scene2uChooseActiveKind()) => {
  if (mode !== 'off' && !kind) return;
  if (mode === 'off') {
    setSlideGizmoMode('off'); detachSlideGizmo();
    setAssetGizmoMode('off'); detachAssetGizmo();
  } else if (kind === 'slide') {
    setAssetGizmoMode('off'); detachAssetGizmo();
    setSlideGizmoMode(mode); attachGizmoToCurrentSlide();
  } else {
    setSlideGizmoMode('off'); detachSlideGizmo();
    setAssetGizmoMode(mode); syncEditingSceneAssetGizmo();
  }
  if (kind) scene2uLastActiveKind = kind;
  scene2uRefreshSelectionGizmo();
  if (mode !== 'off') queueMicrotask(scene2xRefreshPivotAttachment);
};
for (const [mode,button] of Object.entries(scene2uButtons)) {
  button.addEventListener('click',()=>scene2uActivateGizmo(mode));
}
// Explicitly choose the pivot target without changing Current or the selection.
scene2yActiveObjectSelect.addEventListener('change', () => {
  const choice = scene2yActiveObjectSelect.value;
  if (!choice) return;
  const delimiter = choice.indexOf(':');
  const kind = choice.slice(0,delimiter);
  const assetFocus = kind === 'asset' ? scene2yParseAssetFocusValue(choice) : null;
  const id = kind === 'asset' ? assetFocus?.id : choice.slice(delimiter+1);
  const slides = getSelectedSlideEntries().filter(x=>!scene2oIsSlideHidden(x.slideState.id));
  const assets = scene2cGetGroupAssets();
  if (kind==='slide') {
    if (!slides.some(x=>String(x.slideState.id)===id)) return;
    scene2yActiveSlideId=id;
    // In particular, discard the previous Slide Gizmo target before the
    // deferred after-render attachment runs for the newly focused Slide.
    if (activeSlideGizmoManager && slideGizmoMode !== 'off') detachSlideGizmo();
  } else if (kind==='asset') {
    if (!assetFocus || !assets.some(x=>x.presetName===assetFocus.presetName && String(x.asset.id)===String(id))) return;
    if (editingScenePresetName !== assetFocus.presetName) {
      commitAssetTransformNumericEdit();
      editingScenePresetName = assetFocus.presetName;
      canvasSelectedAssetIds.clear();
      for (const assetId of canvasSelectedAssetKeys.get(assetFocus.presetName) ?? []) canvasSelectedAssetIds.add(assetId);
      refreshEditingScenePresetSelector();
    }
    selectedSceneAssetId=id;
    // Keep the existing asset inspector selectors synchronized, without using
    // their change events (which would alter the selection set).
    if (sceneAssetSelector) sceneAssetSelector.value=id;
    if (scenePlacedAssetSelector) scenePlacedAssetSelector.value=id;
    refreshSceneAssetEditor();
    refreshSelectedAssetTransformInputs();
  } else return;
  scene2uLastActiveKind=kind;
  const mode = slideGizmoMode!=='off' ? slideGizmoMode : assetGizmoMode;
  if (mode!=='off') scene2uActivateGizmo(mode,kind);
  else scene2uRefreshSelectionGizmo();
  scene2xRefreshPivotAttachment();
  // The regular Slide adapter attaches after rendering. Explicitly refresh
  // the target as well when the visible manager did not change kind.
  if (kind==='slide' && slideGizmoMode!=='off' && !scene2xShouldAttachPivot()) {
    attachGizmoToCurrentSlide();
  }
});
// Reflect all selection changes (Canvas, thumbnail, clipboard, Undo/Redo).
// The event runs after the originating handler completes, not inside Gizmo drag.
document.addEventListener('slidespace:selection-changed', () => { scene2uRefreshSelectionGizmo(); queueMicrotask(scene2xRefreshPivotAttachment); });
for (const control of [slideTransformPivotSelect,assetTransformPivotSelect]) {
  control?.addEventListener('change',()=>{
    scene2wSelectionPivotMode = control.value === 'individual' ? 'individual' : 'group';
    for (const other of [slideTransformPivotSelect,assetTransformPivotSelect]) {
      other.value = scene2wSelectionPivotMode;
    }
    scene2vSyncControls();
  });
}









// Camera-2D: Project Skybox Library management. The existing environment
// selector still applies detected six-face sets until Camera-2E.
const skyboxLibraryDialog = document.getElementById('skyboxLibraryDialog');
const skyboxLibraryDetected = document.getElementById('skyboxLibraryDetected');
const skyboxLibraryRegistered = document.getElementById('skyboxLibraryRegistered');
const skyboxLibraryName = document.getElementById('skyboxLibraryName');
const skyboxLibraryStatus = document.getElementById('skyboxLibraryStatus');
const skyboxLibraryActionDialog = document.getElementById('skyboxLibraryActionDialog');
const skyboxLibraryActionName = document.getElementById('skyboxLibraryActionName');
const skyboxLibraryActionTitle = document.getElementById('skyboxLibraryActionTitle');
const skyboxLibraryActionInfo = document.getElementById('skyboxLibraryActionInfo');
const skyboxLibraryActionSubmit = document.getElementById('skyboxLibraryActionSubmit');
let skyboxLibraryPendingAction = null;

const refreshSkyboxLibraryManager = function (preferredId = '') {
  const list = normalizeSkyboxLibrary(currentProjectData?.skyboxLibrary);
  const registered = list.filter(item => item.registered);
  const detected = detectedSkyboxSets.filter(set =>
    !registered.some(item => sameSkyboxFaces(item.skybox,set.skybox)));
  skyboxLibraryDetected.replaceChildren(...detected.map(set => {
    const option = document.createElement('option'); option.value=set.name; option.textContent=set.name; return option;
  }));
  const scannedFiles = availableSkyboxFilesProject === currentProjectData ? availableSkyboxFiles : null;
  const missing = registered.filter(item => missingSkyboxFiles(item.skybox, scannedFiles).length);
  skyboxLibraryRegistered.replaceChildren(...registered.map(item => {
    const option = document.createElement('option');
    option.value=item.id;
    const absent = missingSkyboxFiles(item.skybox, scannedFiles);
    option.textContent=`${item.name} (${item.id})${absent.length ? ` — ${t('Missing skybox images')}: ${absent.join(', ')}` : ''}`;
    return option;
  }));
  if (registered.some(item => item.id === preferredId)) skyboxLibraryRegistered.value=preferredId;
  skyboxLibraryStatus.textContent = `${registered.length} ${t('Registered skyboxes')} / ${detected.length} ${t('Unregistered skyboxes')}${missing.length ? ` / ${missing.length} ${t('Skyboxes with missing images')}` : ''}`;
  const selected=registered.find(item=>item.id===skyboxLibraryRegistered.value);
  skyboxLibraryName.value=selected?.name ?? '';
  skyboxLibraryName.disabled = !selected;
  document.getElementById('skyboxLibraryRename').disabled = !selected;
  document.getElementById('skyboxLibraryUnregister').disabled = !selected;
};

const skyboxLibraryScan = async function () {
  if (!currentProjectData || !currentProjectDirectoryHandle) {
    skyboxLibraryStatus.textContent=t('Open a project folder first'); return;
  }
  try { await refreshSkyboxSetSelector(); refreshSkyboxLibraryManager(skyboxLibraryRegistered.value); }
  catch (error) { console.error(error); skyboxLibraryStatus.textContent=t('Skybox scan failed'); }
};

document.getElementById('skyboxLibraryManageButton')?.addEventListener('click', () => {
  if (!skyboxLibraryDialog.open) { refreshSkyboxLibraryManager(); skyboxLibraryDialog.showModal(); void skyboxLibraryScan(); void uiSound.play(); }
});
document.getElementById('skyboxLibraryClose')?.addEventListener('click', () => skyboxLibraryDialog.close());
document.getElementById('skyboxLibraryRescan')?.addEventListener('click', () => void skyboxLibraryScan());
skyboxLibraryRegistered.addEventListener('change', () => refreshSkyboxLibraryManager(skyboxLibraryRegistered.value));
document.getElementById('skyboxLibraryRegister')?.addEventListener('click', () => {
  const set=detectedSkyboxSets.find(entry=>entry.name===skyboxLibraryDetected.value);
  if (!set || !currentProjectData) return;
  const existing=normalizeSkyboxLibrary(currentProjectData.skyboxLibrary);
  // Preserve identities on re-registration; avoid collisions with other sets.
  const previous=existing.find(item=>sameSkyboxFaces(item.skybox,set.skybox));
  const baseId=set.name.trim() || 'skybox';
  let id=previous?.id || baseId; let suffix=2;
  while (!previous && existing.some(item=>item.id===id)) id=`${baseId}-${suffix++}`;
  currentProjectData.skyboxLibrary=registerSkyboxSet(existing,{id,name:previous?.name || set.name,skybox:set.skybox});
  refreshSkyboxLibraryManager(id);
  refreshSkyboxEditorChoices();
  void uiSound.play();
});
// Rename directly from the editable Display name field. Keeping it in the
// manager avoids a second modal and makes the save action unambiguous.
function commitSkyboxLibraryName() {
  if (!currentProjectData) return;
  const id = skyboxLibraryRegistered.value;
  const list = normalizeSkyboxLibrary(currentProjectData.skyboxLibrary);
  const selected = list.find(item => item.id === id && item.registered);
  if (!selected) return;
  const name = skyboxLibraryName.value.trim();
  if (!name) {
    skyboxLibraryStatus.textContent = t('Skybox display name cannot be empty');
    skyboxLibraryName.focus();
    return;
  }
  if (name === selected.name) return;
  currentProjectData.skyboxLibrary = renameSkyboxSet(list, id, name);
  refreshSkyboxLibraryManager(id);
  refreshSkyboxEditorChoices();
  skyboxLibraryStatus.textContent = `${t('Rename Skybox')}: ${name}`;
  void uiSound.play();
}
function requestSkyboxLibraryUnregister() {
  const project = currentProjectData;
  const id = skyboxLibraryRegistered.value;
  const item = normalizeSkyboxLibrary(project?.skyboxLibrary).find(entry => entry.id === id && entry.registered);
  if (!item || skyboxLibraryActionDialog.open) return;
  skyboxLibraryPendingAction = {project, id, kind:'unregister'};
  skyboxLibraryActionTitle.textContent = t('Unregister Skybox');
  skyboxLibraryActionInfo.textContent = t('Unregister from the library without deleting any images or scene assignments.');
  skyboxLibraryActionName.hidden = true;
  skyboxLibraryActionSubmit.textContent = t('Unregister Skybox');
  skyboxLibraryActionDialog.showModal();
}
document.getElementById('skyboxLibraryRename')?.addEventListener('click', commitSkyboxLibraryName);
skyboxLibraryName.addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); commitSkyboxLibraryName(); }
  else if (event.key === 'Escape') {
    event.preventDefault();
    refreshSkyboxLibraryManager(skyboxLibraryRegistered.value);
  }
});
document.getElementById('skyboxLibraryUnregister')?.addEventListener('click', requestSkyboxLibraryUnregister);
document.getElementById('skyboxLibraryActionCancel')?.addEventListener('click',()=>skyboxLibraryActionDialog.close());
document.getElementById('skyboxLibraryActionForm')?.addEventListener('submit', event => {
  event.preventDefault();
  const pending=skyboxLibraryPendingAction;
  if (!pending || pending.project!==currentProjectData) {skyboxLibraryActionDialog.close();return;}
  const list=normalizeSkyboxLibrary(currentProjectData.skyboxLibrary);
  if (!list.some(item=>item.id===pending.id && item.registered)) {skyboxLibraryActionDialog.close();return;}
  try {
    currentProjectData.skyboxLibrary=unregisterSkyboxSet(list,pending.id);
    skyboxLibraryActionDialog.close();
    skyboxLibraryPendingAction=null;
    refreshSkyboxLibraryManager();
    refreshSkyboxEditorChoices();
    void uiSound.play();
  } catch(error) {skyboxLibraryActionInfo.textContent=error.message;}
});
for(const dialog of [skyboxLibraryDialog,skyboxLibraryActionDialog]) {
  for(const type of ['keydown','keyup']) dialog.addEventListener(type,event=>event.stopPropagation());
}

refreshProjectAssetFilesButton.addEventListener("click", async () => {
  try { await registerDetectedAssetFiles(); }
  catch (error) { console.error("Asset Library scan failed:", error); projectAssetLibraryStatus.textContent = t("Asset scan failed"); }
});
projectAssetLibrarySelector.addEventListener("change", () => refreshAssetLibrarySelectors(projectAssetLibrarySelector.value));
// Scene-1Q: Use the same management-dialog pattern as Audio Library.
// Keep the existing selector, import input and actions: their event handlers
// and project.json format do not change when moving them into this dialog.
const projectAssetManageDialog = document.getElementById("projectAssetManageDialog");
document.getElementById("projectAssetManageButton")?.addEventListener("click", () => {
  if (!projectAssetManageDialog?.open) {
    refreshAssetLibrarySelectors(projectAssetLibrarySelector.value);
    projectAssetManageDialog.showModal();
    void uiSound.play();
  }
});
document.getElementById("projectAssetManageClose")?.addEventListener("click", () => {
  projectAssetManageDialog?.close();
  void uiSound.play();
});
for (const type of ["keydown", "keyup"]) {
  projectAssetManageDialog?.addEventListener(type, (event) => event.stopPropagation());
}

// Capture the project and path when the dialog opens. If the project changes
// while the dialog is open, the confirmation is discarded instead of editing
// another project or a newly selected item.
const showAssetLibraryAction = function (kind) {
  const project = currentProjectData;
  const path = projectAssetLibrarySelector.value;
  const item = project?.assetLibrary?.find(entry => entry.path === path);
  if (!item || assetLibraryActionDialog.open) return;
  assetLibraryPendingAction = {kind, path, project};
  assetLibraryActionError.textContent = "";
  const renaming = kind === "rename";
  assetLibraryActionTitle.textContent = t(renaming ? "Rename Asset" : "Unregister Asset");
  assetLibraryActionDescription.textContent = renaming
    ? `${t("Rename Asset explanation")} ${item.path}`
    : `${t("Unregister Asset explanation")} ${item.label} (${item.path})`;
  assetLibraryNameLabel.hidden = !renaming;
  assetLibraryNameInput.hidden = !renaming;
  assetLibraryNameInput.value = renaming ? item.label : "";
  assetLibraryActionConfirm.textContent = t(renaming ? "Save Asset name" : "Confirm unregister Asset");
  assetLibraryActionDialog.showModal();
  if (renaming) assetLibraryNameInput.focus();
};
projectAssetRenameButton.addEventListener("click", () => showAssetLibraryAction("rename"));
projectAssetUnregisterButton.addEventListener("click", () => showAssetLibraryAction("unregister"));
assetLibraryActionCancel.addEventListener("click", () => assetLibraryActionDialog.close());
assetLibraryActionDialog.addEventListener("close", () => {assetLibraryPendingAction = null;});
assetLibraryActionForm.addEventListener("submit", event => {
  event.preventDefault();
  const pending = assetLibraryPendingAction;
  if (!pending || currentProjectData !== pending.project ||
      !pending.project.assetLibrary?.some(entry => entry.path === pending.path)) {
    assetLibraryActionDialog.close();
    return;
  }
  if (pending.kind === "rename") {
    const renamed = renameAsset(pending.project.assetLibrary, pending.path, assetLibraryNameInput.value);
    if (!renamed) {
      assetLibraryActionError.textContent = t("Enter a valid Asset display name");
      return;
    }
    pending.project.assetLibrary = renamed;
  } else {
    pending.project.assetLibrary = unregisterAsset(pending.project.assetLibrary, pending.path);
  }
  const preferred = pending.kind === "rename" ? pending.path : "";
  assetLibraryActionDialog.close();
  refreshAssetLibrarySelectors(preferred);
  if (pending.kind === "rename") refreshSceneAssetEditor();
});
// Reset only the Library label. Never touch the file or any Scene placement.
projectAssetResetNameButton.addEventListener("click", () => {
  const project = currentProjectData;
  const path = projectAssetLibrarySelector.value;
  if (!project?.assetLibrary?.some(entry => entry.path === path)) return;
  const reset = renameAsset(project.assetLibrary, path, assetFilename(path));
  if (!reset) return;
  project.assetLibrary = reset;
  refreshAssetLibrarySelectors(path);
  refreshSceneAssetEditor();
});
projectAssetImportButton.addEventListener("click", () => projectAssetImportInput.click());
projectAssetImportInput.addEventListener("change", async () => {
  try { await importProjectAssetFiles(projectAssetImportInput.files ?? []); }
  catch (error) { console.error("Asset import failed:", error); projectAssetLibraryStatus.textContent = t("Asset import failed"); }
  finally { projectAssetImportInput.value = ""; }
});

addSceneAssetButton.addEventListener("click", async () => {
  try {
    const selectedOption = projectAssetFileSelector.selectedOptions[0];

    if (!selectedOption || !selectedOption.value) {
      return;
    }

    const preset = getEditingScenePresetConfig();

    if (!preset) {
      return;
    }

    preset.assets ??= [];

    const src = selectedOption.value;

    const type = selectedOption.dataset.assetType;

    const insertIndex = preset.assets.length;

    const assetConfig = createDefaultAssetConfig(src, type);

    // Scene-4B: Set the initial position before loading the Asset and before
    // recording its presence in history. The choice is editor-only UI state.
    const assetPlacement = document.getElementById("sceneAssetPlacementSelect")?.value ?? "camera";
    if (assetPlacement === "camera" && camera) {
      const forward = camera.getDirection(Vector3.Forward());
      const inputDistance = Number(document.getElementById("sceneAssetPlacementDistance")?.value);
      const distance = Number.isFinite(inputDistance) && inputDistance >= 0.1 && inputDistance <= 10000
        ? inputDistance : 2;
      assetConfig.transform.position = initialAssetPosition(
        assetPlacement,
        [camera.position.x, camera.position.y, camera.position.z],
        [forward.x, forward.y, forward.z], distance,
      );
    }

    // -------------------------
    // Configへ追加
    // -------------------------

    preset.assets.push(assetConfig);

    try {
      // -------------------------
      // Sceneへロード
      // -------------------------

      await loadAndRegisterSceneAsset(assetConfig, editingScenePresetName);
    } catch (error) {
      // Load失敗ならConfigも戻す

      console.warn("Scene asset load failed:", assetConfig, error);

      preset.assets = preset.assets.filter((asset) => asset !== assetConfig);

      throw error;
    }

    // =============================
    // History
    // =============================

    pushEditorHistory({
      type: "asset-presence",

      presetName: editingScenePresetName,

      assetId: assetConfig.id,

      assetConfig: structuredClone(assetConfig),

      index: insertIndex,

      beforeExists: false,

      afterExists: true,
    });

    // -------------------------
    // 新Assetを選択
    // -------------------------

    scene4cAssetSelectionCleared = false;
    selectedSceneAssetId = assetConfig.id;
    canvasSelectedAssetIds.clear();
    canvasSelectedAssetIds.add(assetConfig.id);
    scene2fSelectAsset(editingScenePresetName, assetConfig.id);

    refreshSceneAssetEditor();

    if (isEditingScenePresetVisible() && assetGizmoMode !== "off") {
      attachGizmoToSelectedAsset();
    } else {
      detachAssetGizmo();
    }
  } catch (error) {
    console.error("Scene asset add failed:", error);
  }
});

// Scene-2L: atomic creation and deletion across Scenes with a single history entry.
const scene2lCreateAssetCopies = async (sources, offset) => {
  if (editorHistoryBusy || !sources.length || !currentProjectData) return false;
  const project = currentProjectData;
  const entries = createAssetDuplicateEntries(sources, createUniqueAssetId, offset);
  if (!entries.length) return false;
  const created = [];
  editorHistoryBusy = true;
  try {
    for (const entry of entries) {
      if (currentProjectData !== project) throw new Error("Project changed while copying Assets");
      const preset = getScenePresetConfigByName(entry.presetName);
      if (!preset) throw new Error(`Scene not found: ${entry.presetName}`);
      preset.assets ??= [];
      const index = preset.assets.length;
      preset.assets.push(entry.assetConfig);
      try { await loadAndRegisterSceneAsset(entry.assetConfig, entry.presetName); }
      catch (error) { preset.assets.splice(index, 1); throw error; }
      created.push({ presetName: entry.presetName, assetId: entry.assetConfig.id,
        assetConfig: structuredClone(entry.assetConfig), index, beforeExists: false, afterExists: true });
    }
  } catch (error) {
    for (const item of [...created].reverse()) await applyAssetPresenceState(item, false);
    throw error;
  } finally { editorHistoryBusy = false; }
  pushEditorHistory({ type: "asset-presence-batch", assets: created });
  scene2fClearAssetSelection();
  canvasSelectedAssetIds.clear();
  for (const item of created) scene2fSelectAsset(item.presetName, item.assetId);
  for (const id of canvasSelectedAssetKeys.get(editingScenePresetName) ?? []) canvasSelectedAssetIds.add(id);
  selectedSceneAssetId = [...canvasSelectedAssetIds].at(-1) ?? null;
  refreshSceneAssetEditor();
  syncEditingSceneAssetGizmo();
  scene2cUpdateGroupStatus();
  return created.length;
};

const scene2lDeleteSelectedAssets = async () => {
  if (editorHistoryBusy || !currentProjectData) return false;
  const selected = scene2cGetGroupAssets();
  if (!selected.length) return false;
  const project = currentProjectData;
  const removed = [];
  editorHistoryBusy = true;
  try {
    for (const {presetName, asset} of selected) {
      if (currentProjectData !== project) throw new Error("Project changed while deleting Assets");
      const preset = getScenePresetConfigByName(presetName);
      const index = preset?.assets?.findIndex(item => item.id === asset.id) ?? -1;
      if (index < 0) continue;
      const item = { presetName, assetId: asset.id, assetConfig: structuredClone(asset),
        index, beforeExists: true, afterExists: false };
      const success = await applyAssetPresenceState(item, false);
      if (!success) throw new Error(`Cannot delete Asset: ${asset.id}`);
      removed.push(item);
    }
  } catch (error) {
    for (const item of [...removed].reverse()) await applyAssetPresenceState(item, true);
    throw error;
  } finally { editorHistoryBusy = false; }
  if (!removed.length) return false;
  pushEditorHistory({ type: "asset-presence-batch", assets: removed });
  scene2fClearAssetSelection();
  canvasSelectedAssetIds.clear();
  selectedSceneAssetId = null;
  refreshSceneAssetEditor();
  syncEditingSceneAssetGizmo();
  scene2cUpdateGroupStatus();
  return removed.length;
};

// Scene-2M: shared Asset operations for inspector buttons and Canvas menu.
const scene2mCopyAssets = () => {
  if (editorHistoryBusy) return false;
  assetClipboardSnapshot = scene2cGetGroupAssets().map(({presetName,asset}) => ({
    presetName, asset: structuredClone(asset),
  }));
  assetClipboardProject = currentProjectData;
  scene2lSetStatus("Assets copied", assetClipboardSnapshot.length);
  refreshSceneAssetActionButtons();
  return Boolean(assetClipboardSnapshot.length);
};
const scene2mPasteAssets = async ({inPlace = false} = {}) => {
  if (assetClipboardProject !== currentProjectData) {
    assetClipboardSnapshot = []; assetClipboardProject = null;
    refreshSceneAssetActionButtons(); return false;
  }
  const count = await scene2lCreateAssetCopies(assetClipboardSnapshot,
    inPlace ? [0, 0, 0] : scene2lOffset());
  if (count) scene2lSetStatus("Assets pasted", count);
  return count;
};
const scene2mDuplicateAssets = async () => {
  const count = await scene2lCreateAssetCopies(scene2cGetGroupAssets(), scene2lOffset());
  if (count) scene2lSetStatus("Assets pasted", count);
  return count;
};
const scene2mDeleteAssets = async () => {
  const count = await scene2lDeleteSelectedAssets();
  if (count) scene2lSetStatus("Assets deleted", count);
  return count;
};

duplicateSceneAssetButton.addEventListener("click", async () => {
  try { await scene2mDuplicateAssets(); }
  catch (error) { console.error("Scene asset duplicate failed:", error); scene2lSetStatus("Asset operation failed"); }
});
copySelectedAssetsButton?.addEventListener("click", scene2mCopyAssets);
pasteSelectedAssetsButton?.addEventListener("click", async () => {
  try { await scene2mPasteAssets(); }
  catch (error) { console.error("Scene Asset paste failed:", error); scene2lSetStatus("Asset operation failed"); }
});
deleteSceneAssetButton.addEventListener("click", async () => {
  try { await scene2mDeleteAssets(); }
  catch (error) { console.error("Scene Asset batch deletion failed:", error); scene2lSetStatus("Asset operation failed"); }
});

// Scene-2O: editor-only temporary per-object hiding. Visibility state never enters
// project data and can be restored even when hidden objects are not pickable.
const scene2oRestoreHiddenButton = document.getElementById('scene2oRestoreHiddenButton');
const scene2oHideSelectedButton = document.getElementById('scene2oHideSelectedButton');
const scene2oHiddenStatus = document.getElementById('scene2oHiddenStatus');
const scene2oRefreshHiddenStatus = () => {
  scene2oEnsureVisibilityProject();
  const assetCount = [...scene2oHiddenAssetIds.values()].reduce((sum,ids)=>sum+ids.size,0);
  if (scene2oHiddenStatus) scene2oHiddenStatus.textContent = `${t('Temporarily hidden')}: ${scene2oHiddenSlideIds.size} ${t('Slides')}, ${assetCount} ${t('Assets')}`;
  if (scene2oRestoreHiddenButton) scene2oRestoreHiddenButton.disabled = !scene2oHiddenSlideIds.size && !assetCount;
};
const scene2oRefreshHiddenCanvas = () => {
  scenePreviewUi.guidesSignature = null;
  refreshEditorVisualGuides();
  refreshCanvasSelectionHighlights();
  refreshCurrentSlideGizmoAfterTransform();
  syncEditingSceneAssetGizmo();
  refreshSharedTransformControls();
  scene2cUpdateGroupStatus();
  scene2oRefreshHiddenStatus();
};
const scene2oHideSelected = kind => {
  if (!isEditorMode() || scenePreviewUi.previewName) return;
  // Scene-2S: resolve explicit Selection before any mutations. The inspector
  // may show an Asset with 0 selected; that focus is never an operation target.
  const selectedAssets = kind === 'slide' ? [] : scene2cGetGroupAssets();
  const selectedSlides = kind === 'asset' ? [] : getSlideOperationTargetEntries();
  if (!selectedAssets.length && !selectedSlides.length) return;
  scene2oEnsureVisibilityProject();
  if (kind !== 'asset') {
    for (const {slideState} of selectedSlides) scene2oHiddenSlideIds.add(slideState.id);
  }
  if (kind !== 'asset') {
    for (const id of [...selectedSlideIds]) if (scene2oHiddenSlideIds.has(id)) selectedSlideIds.delete(id);
    renderSlideThumbnails();
    refreshSlideSelectionUi();
  }
  if (kind !== 'slide') {
    const explicitlySelectedAssets = selectedAssets;
    for (const {presetName,asset} of explicitlySelectedAssets) scene2oHideAsset(presetName,asset.id);
    if (explicitlySelectedAssets.length) {
      // Clear only what was actually selected. Inspector focus alone is not a selection.
      canvasSelectedAssetIds.clear();
      scene2fClearAssetSelection();
      selectedSceneAssetId = null;
      refreshSceneAssetEditor();
    }
  }
  scene2oRefreshHiddenCanvas();
};
const scene2oRestoreAllHidden = () => {
  scene2oEnsureVisibilityProject();
  scene2oHiddenSlideIds.clear();
  scene2oHiddenAssetIds.clear();
  scene2oRefreshHiddenCanvas();
};
document.getElementById('scene2qClearSelectionButton')?.addEventListener('click', scene2qClearSelection);
scene2oHideSelectedButton?.addEventListener('click',()=>scene2oHideSelected());
scene2oRestoreHiddenButton?.addEventListener('click',scene2oRestoreAllHidden);
onLanguageChange(scene2oRefreshHiddenStatus);
scene2oRefreshHiddenStatus();

// Scene-2M: Canvas-specific context menu; never intercept Drawing/Presentation/Preview.
const scene2mCanvasMenu = document.getElementById("canvasContextMenu");
let scene2mCanvasTarget = null;
const scene2mCloseCanvasMenu = () => {
  scene2mCanvasMenu.hidden = true;
  scene2mCanvasTarget = null;
};
const scene2mAssetSelectionContains = (picked) => {
  const group = canvasSelectedAssetKeys.get(picked.presetName);
  return Boolean(group?.has(picked.id));
};
const scene2mOpenCanvasMenu = (clientX,clientY,kind,{keyboardInvoked=false}={}) => {
  scene2mCanvasMenu.querySelectorAll('[data-canvas-kind]').forEach(node => {
    node.hidden = !(node.dataset.canvasKind === kind || node.dataset.canvasKind === 'all');
  });
  const assetCount = scene2cGetGroupAssets().length;
  const slideCount = getSlideOperationTargetEntries().length;
  const validAssetClipboard = assetClipboardProject === currentProjectData && assetClipboardSnapshot.length > 0;
  const disabled = {
    'asset-only': !scene2mCanvasTarget || scene2mCanvasTarget.kind !== 'asset',
    'set-current': !scene2mCanvasTarget || scene2mCanvasTarget.kind !== 'slide',
    'set-active': !scene2mCanvasTarget || (scene2mCanvasTarget.kind === 'slide'
      ? !selectedSlideIds.has(slideStates[scene2mCanvasTarget.index]?.id)
      : !scene2mAssetSelectionContains(scene2mCanvasTarget)),
    'slide-only': !scene2mCanvasTarget || scene2mCanvasTarget.kind !== 'slide',
    'asset-gizmo': !assetCount || scenePreviewUi.hideAssets,
    'slide-gizmo': !slideCount || scenePreviewUi.hideSlideObjects,
    'asset-copy': !assetCount, 'asset-duplicate': !assetCount,
    'asset-delete': !assetCount,
    'hide-selection': !assetCount && !slideCount,
    'restore-hidden': !scene2oHiddenSlideIds.size && ![...scene2oHiddenAssetIds.values()].some(ids => ids.size),
    'asset-paste': !validAssetClipboard, 'asset-paste-place': !validAssetClipboard,
    'slide-copy': !slideCount, 'slide-duplicate': !slideCount,
    'slide-delete': !slideCount,
    'slide-paste': copiedSlideSnapshots.length === 0,
    'slide-paste-place': copiedSlideSnapshots.length === 0,
  };
  for (const button of scene2mCanvasMenu.querySelectorAll('[data-canvas-command]')) {
    button.disabled = editorHistoryBusy || Boolean(disabled[button.dataset.canvasCommand]);
  }
  scene2mCanvasMenu.hidden = false;
  scene2mCanvasMenu.style.left = '0px'; scene2mCanvasMenu.style.top = '0px';
  const rect = scene2mCanvasMenu.getBoundingClientRect();
  const margin = 8;
  scene2mCanvasMenu.style.left = `${Math.max(margin,Math.min(clientX,window.innerWidth-rect.width-margin))}px`;
  scene2mCanvasMenu.style.top = `${Math.max(margin,Math.min(clientY,window.innerHeight-rect.height-margin))}px`;
  // Keyboard invocation needs an initial focus target for menu navigation.
  // Mouse right-click must not force a visible focus outline onto the first
  // command: it is not an active/selected indicator.
  if (!keyboardInvoked && scene2mCanvasMenu.contains(document.activeElement)) {
    document.activeElement?.blur();
  }
  if (keyboardInvoked) {
    scene2mCanvasMenu.querySelector('[data-canvas-command]:not([hidden]):not(:disabled)')?.focus();
  }
};
webglCanvas.addEventListener('contextmenu', async event => {
  if (!isEditorMode() || drawingController.isActive() || scenePreviewUi.previewName) return;
  if (event.altKey || event.shiftKey) return;
  event.preventDefault();
  closeSlideContextMenu();
  scene2mCloseCanvasMenu();
  if (!scene || editorHistoryBusy) return;
  const rect = webglCanvas.getBoundingClientRect();
  const pickedInfo = scene.pick(event.clientX-rect.left,event.clientY-rect.top);
  const picked = pickedInfo?.hit ? findCanvasEditorPickTarget(pickedInfo.pickedMesh) : null;
  // Preserve a multiple selection when right-clicking one of its members.
  if (picked?.kind === 'slide') {
    const state = slideStates[picked.index];
    if (!state) return;
    if (!selectedSlideIds.has(state.id)) {
      // Right-click selects the context target, but does NOT silently change
      // Current/Scene. "Set as Current Slide" is an explicit menu command.
      selectedSlideIds.clear();
      selectedSlideIds.add(state.id);
      canvasSelectedAssetIds.clear();
      scene2fClearAssetSelection();
      selectedSceneAssetId = null;
      renderSlideThumbnails();
      refreshSlideSelectionUi();
      refreshSceneAssetEditor();
      syncEditingSceneAssetGizmo();
    }
  } else if (picked?.kind === 'asset') {
    if (!scene2mAssetSelectionContains(picked)) await selectFromEditorCanvas(pickedInfo);
  }
  scene2mCanvasTarget = picked;
  if (picked?.kind) scene2uLastActiveKind = picked.kind;
  scene2uRefreshSelectionGizmo();
  scene2mOpenCanvasMenu(event.clientX,event.clientY,picked?.kind || 'empty',{keyboardInvoked:event.button !== 2 && event.detail === 0});
});
scene2mCanvasMenu.addEventListener('click', async event => {
  const button = event.target.closest?.('[data-canvas-command]');
  if (!button || button.disabled) return;
  const command = button.dataset.canvasCommand;
  const menuTarget = scene2mCanvasTarget;
  scene2mCloseCanvasMenu();
  try {
    switch (command) {
      case 'slide-gizmo':
      case 'asset-gizmo':
        document.dispatchEvent(new CustomEvent('slidespace:reveal-transform', {
          detail: {kind: command === 'slide-gizmo' ? 'slide' : 'asset'},
        }));
        break;
      case 'set-active': {
        // A context menu can switch the focused object without modifying
        // Selection or Current. Keep the Scene-qualified Asset identity.
        if (!menuTarget) break;
        if (menuTarget.kind === 'slide') {
          const slide = slideStates[menuTarget.index];
          if (!slide || !selectedSlideIds.has(slide.id)) break;
          scene2uRefreshSelectionGizmo();
          scene2yActiveObjectSelect.value = `slide:${slide.id}`;
        } else if (menuTarget.kind === 'asset') {
          if (!scene2mAssetSelectionContains(menuTarget)) break;
          if (editingScenePresetName !== menuTarget.presetName) {
            commitAssetTransformNumericEdit();
            editingScenePresetName = menuTarget.presetName;
            canvasSelectedAssetIds.clear();
            for (const id of canvasSelectedAssetKeys.get(menuTarget.presetName) ?? []) canvasSelectedAssetIds.add(id);
            refreshEditingScenePresetSelector();
          }
          // Preselect the actual clicked asset, even if a different one was
          // the previously focused (and still selected) asset.
          selectedSceneAssetId = menuTarget.id;
          scene2uRefreshSelectionGizmo();
          scene2yActiveObjectSelect.value = scene2yAssetFocusValue(menuTarget.presetName,menuTarget.id);
        } else break;
        scene2yActiveObjectSelect.dispatchEvent(new Event('change', {bubbles:true}));
        document.dispatchEvent(new CustomEvent('slidespace:reveal-transform', {
          detail: {kind:'selection'},
        }));
        break;
      }
      case 'set-current': {
        if (menuTarget?.kind === 'slide' && slideStates[menuTarget.index]) {
          await selectSlideByIndex(menuTarget.index, {moveCamera:false, preserveSelection:true});
          document.dispatchEvent(new Event('slidespace:selection-changed'));
        }
        break;
      }
      case 'slide-only': {
        // Right clicking a selected member normally preserves the entire
        // selection. This explicit command collapses it without moving Camera.
        const pickedSlide = menuTarget?.kind === 'slide' ? slideStates[menuTarget.index] : null;
        if (pickedSlide) {
          await selectSlideByIndex(menuTarget.index, {moveCamera:false});
          canvasSelectedAssetIds.clear();
          scene2fClearAssetSelection();
          selectedSceneAssetId = null;
          refreshSceneAssetEditor();
          syncEditingSceneAssetGizmo();
        }
        break;
      }
      case 'asset-only': {
        const pickedAsset = menuTarget?.kind === 'asset' ? menuTarget : null;
        if (pickedAsset?.id) {
          commitAssetTransformNumericEdit();
          scene2fClearAssetSelection();
          canvasSelectedAssetIds.clear();
          editingScenePresetName = pickedAsset.presetName ?? editingScenePresetName;
          refreshEditingScenePresetSelector();
          canvasSelectedAssetIds.add(pickedAsset.id);
          scene2fSelectAsset(editingScenePresetName, pickedAsset.id);
          selectedSceneAssetId = pickedAsset.id;
          selectedSlideIds.clear();
          renderSlideThumbnails();
          refreshSlideSelectionUi();
          refreshSceneAssetEditor();
          syncEditingSceneAssetGizmo();
          scene2cUpdateGroupStatus();
        }
        break;
      }
      case 'asset-copy': scene2mCopyAssets(); break;
      case 'asset-paste': await scene2mPasteAssets(); break;
      case 'asset-paste-place': await scene2mPasteAssets({inPlace:true}); break;
      case 'asset-duplicate': await scene2mDuplicateAssets(); break;
      case 'asset-delete': await scene2mDeleteAssets(); break;
      case 'hide-selection': scene2oHideSelected(); break;
      case 'restore-hidden': scene2oRestoreAllHidden(); break;
      case 'slide-copy': await executeSlideCommand('copy'); break;
      case 'slide-paste': await executeSlideCommand('paste-after'); break;
      case 'slide-paste-place': await pasteCopiedSlides({inPlace:true}); break;
      case 'slide-duplicate': await executeSlideCommand('duplicate'); break;
      case 'slide-delete': await executeSlideCommand('delete'); break;

    }
  } catch (error) { console.error('Canvas context command failed:',command,error); scene2lSetStatus('Asset operation failed'); }
});
window.addEventListener('pointerdown', event => {
  if (!scene2mCanvasMenu.hidden && !scene2mCanvasMenu.contains(event.target)) scene2mCloseCanvasMenu();
}, true);
window.addEventListener('scroll', scene2mCloseCanvasMenu, true);
window.addEventListener('resize', scene2mCloseCanvasMenu);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !scene2mCanvasMenu.hidden) {
    event.preventDefault(); event.stopImmediatePropagation(); scene2mCloseCanvasMenu();
  }
}, true);

document.getElementById("assetRotationResetButton")?.addEventListener("click", resetSelectedAssetRotation);

assetUniformScaleCheck.addEventListener("click", (event) => {
  event.preventDefault();
  assetUniformScaleEnabled = !assetUniformScaleEnabled;

  const asset = getSelectedSceneAssetConfig();

  if (!asset) {
    return;
  }

  const transform = ensureAssetTransform(asset);
  const before = cloneAssetTransform(transform);
  const groupEdit = assetUniformScaleEnabled ? scene2iBeginNumericAssetScale() : null;

  // =====================================
  // OFF → ON にした場合
  //
  // 現在のXを基準にXYZを統一
  // =====================================

  if (assetUniformScaleEnabled) {
    const value = Number(transform.scale[0]);

    transform.scale = [value, value, value];

    applySelectedAssetTransform();
  }

  refreshSelectedAssetTransformInputs();

  refreshAssetUniformScaleUi();
  if (groupEdit) {
    scene2cUpdateGroup(groupEdit);
    scene2cCommitGroup(groupEdit);
  } else recordAssetTransformHistory(asset, before, cloneAssetTransform(ensureAssetTransform(asset)));
});


for (const input of assetTransformInputs) {
  // Scene-2I: scale inputs own their group-level undo transaction.
  if ([assetScaleX, assetScaleY, assetScaleZ, assetUniformScaleInput].includes(input)) continue;
  input.addEventListener("focus", beginAssetTransformNumericEdit);
  input.addEventListener("change", commitAssetTransformNumericEdit);
}

undoEditorButton.addEventListener("click", async () => {
  try {
    await undoEditorAction();
    scene3cRefreshAbsolute();
  } catch (error) {
    console.error("Undo failed:", error);
  }
});

redoEditorButton.addEventListener("click", async () => {
  try {
    await redoEditorAction();
    scene3cRefreshAbsolute();
  } catch (error) {
    console.error("Redo failed:", error);
  }
});

// Scene-4N: Selection highlight uses editor-only line meshes exclusively.
// In Scene-4M, disabling selection outlines eliminated the reproducible WebGL
// glGetProgramiv warnings. The previous GLB silhouette path used Babylon's
// renderOutline shader pass; avoid that additional shader program entirely.
// The slide/asset boxes are non-pickable and follow child mesh world transforms.
const canvasSelectionOutlines = new Map();
const showSelectionHighlightsCheckbox = document.getElementById("showSelectionHighlightsCheckbox");
let showSelectionHighlights = Boolean(showSelectionHighlightsCheckbox?.checked);
showSelectionHighlightsCheckbox?.addEventListener("change", event => {
  showSelectionHighlights = Boolean(event.target.checked);
  refreshCanvasSelectionHighlights();
});

const selectionLocalBoxLines = meshes => {
  const lines = [];
  for (const mesh of meshes) {
    if (!mesh || mesh.isDisposed?.() || !mesh.getBoundingInfo) continue;
    mesh.computeWorldMatrix(true);
    const info = mesh.getBoundingInfo()?.boundingBox;
    if (!info) continue;
    const low = info.minimum, high = info.maximum;
    const world = mesh.getWorldMatrix();
    const points = [
      [low.x,low.y,low.z],[high.x,low.y,low.z],
      [high.x,high.y,low.z],[low.x,high.y,low.z],
      [low.x,low.y,high.z],[high.x,low.y,high.z],
      [high.x,high.y,high.z],[low.x,high.y,high.z],
    ].map(coords => Vector3.TransformCoordinates(new Vector3(...coords),world));
    // A small visual margin avoids Z-fighting with coplanar Slide images.
    const center = points.reduce((sum,p)=>sum.add(p),Vector3.Zero()).scale(1/8);
    const expanded = points.map(p=>center.add(p.subtract(center).scale(1.012)));
    const edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    for (const [a,b] of edges) lines.push([expanded[a],expanded[b]]);
  }
  return lines;
};
const refreshCanvasSelectionHighlights = () => {
  if (!scene) return;
  const visible = !scene4mNoOutline && showSelectionHighlights && isEditorMode() && !scenePreviewUi.previewName;
  const desired = new Map();
  if (visible) {
    for (const slide of slideStates) {
      if (!scenePreviewUi.hideSlideObjects && !scene2oIsSlideHidden(slide.id) && selectedSlideIds.has(slide.id) && slide.mesh && !slide.mesh.isDisposed()) {
        desired.set(`slide:${slide.id}`,[slide.mesh]);
      }
    }
    const names = scenePreviewUi.allScenes ? [...canvasSelectedAssetKeys.keys()] : [editingScenePresetName];
    for (const presetName of names) {
      const cached=scenePresetAssetCache.get(presetName);
      const selected=canvasSelectedAssetKeys.get(presetName) ?? new Set();
      const validIds=new Set((cached?.assets ?? []).map(item=>item.config?.id));
      for (const id of [...selected]) if (!validIds.has(id)) scene2fSelectAsset(presetName,id,false);
      for (const loaded of cached?.assets ?? []) {
        if (scenePreviewUi.hideAssets || scene2oIsAssetHidden(presetName,loaded.config?.id) || !selected.has(loaded.config?.id) || !loaded.rootNode) continue;
        const meshes=loaded.rootNode.getChildMeshes?.(false) ?? [];
        if (loaded.rootNode instanceof Mesh) meshes.push(loaded.rootNode);
        desired.set(`asset:${encodeURIComponent(presetName)}:${loaded.config.id}`, meshes);
      }
    }
  }
  for (const [key,entry] of canvasSelectionOutlines) {
    if (desired.has(key) && entry.scene===scene) continue;
    if (!entry.mesh.isDisposed()) entry.mesh.dispose();
    canvasSelectionOutlines.delete(key);
  }
  for (const [key,meshes] of desired) {
    const lines=selectionLocalBoxLines(meshes);
    const old=canvasSelectionOutlines.get(key);
    if (!lines.length) {
      if (old && !old.mesh.isDisposed()) old.mesh.dispose();
      canvasSelectionOutlines.delete(key);
      continue;
    }
    const signature=lines.flat(2).map(v=>`${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`).join(';');
    if (old?.signature===signature && old.scene===scene && !old.mesh.isDisposed()) continue;
    // Updating a persistent line mesh avoids shader/vertex-buffer churn on each
    // Gizmo drag frame. Rebuild only when the number of mesh edges changes.
    if (old && old.scene===scene && old.lineCount===lines.length && !old.mesh.isDisposed()) {
      MeshBuilder.CreateLineSystem(null,{lines,instance:old.mesh});
      old.signature=signature;
      continue;
    }
    if (old && !old.mesh.isDisposed()) old.mesh.dispose();
    const outline=MeshBuilder.CreateLineSystem(`editor-selection-${key}`,{lines,updatable:true},scene);
    outline.isPickable=false;
    outline.color=key.startsWith('slide:') ? new Color3(0.15,0.9,1) : new Color3(1,0.66,0.2);
    outline.renderingGroupId=2;
    canvasSelectionOutlines.set(key,{mesh:outline,signature,scene,lineCount:lines.length});
  }
};

const scenePreviewUi = {
  previewName: null,
  currentId: null,
  hiddenSlides: false,
  hideSlideObjects: false,
  hideAssets: false,
  allScenes: false,
  positions: false,
  cameraPath: false,
  cameraPositions: false,
  guidesScene: null,
  guidesSignature: null,
  guideMeshes: [],
};
const previewSceneButton = document.getElementById("previewEditingSceneButton");
const hideEditorSlidesCheckbox = document.getElementById("hideEditorSlidesCheckbox");
const hideSlideObjectsCheckbox = document.getElementById("hideSlideObjectsCheckbox");
const hideSceneAssetsCheckbox = document.getElementById("hideSceneAssetsCheckbox");
const showAllScenesCheckbox = document.getElementById("showAllScenesCheckbox");
const showSlidePositionsCheckbox = document.getElementById("showSlidePositionsCheckbox");
const showCameraPathCheckbox = document.getElementById("showCameraPathCheckbox");
const showCameraPositionsCheckbox = document.getElementById("showCameraPositionsCheckbox");
const scenePreviewStatus = document.getElementById("scenePreviewStatus");

const updateScenePreviewUi = () => {
  if (previewSceneButton) previewSceneButton.textContent = t(scenePreviewUi.previewName ? "Exit Scene Preview" : "Preview editing Scene");
  if (scenePreviewStatus) scenePreviewStatus.textContent = scenePreviewUi.previewName
    ? `${t("Previewing Scene")}: ${scenePreviewUi.previewName}`
    : t("Scene Preview keeps Current unchanged");
};
const stopScenePreview = async () => {
  if (!scenePreviewUi.previewName) return;
  scenePreviewUi.previewName = null;
  scenePreviewUi.currentId = null;
  updateScenePreviewUi();
  if (getCurrentSlideState()) await applyCurrentSlideSceneState();
};
const toggleScenePreview = async () => {
  if (!scene || !currentProjectData || isPresentationMode()) return;
  if (scenePreviewUi.previewName) { await stopScenePreview(); return; }
  const name = editingScenePresetName;
  const preset = currentProjectData.scenePresets?.[name];
  if (!preset) return;
  scenePreviewUi.previewName = name;
  scenePreviewUi.currentId = getCurrentSlideState()?.id ?? null;
  updateScenePreviewUi();
  // Resolve and activate Scene assets without assigning the Scene to a Slide.
  const surrogate = { ...(getCurrentSlideState() ?? {}), scenePreset: name, environmentOverride: {} };
  const activated = await activateScenePreset(surrogate);
  if (!activated) { scenePreviewUi.previewName = null; updateScenePreviewUi(); return; }
  await applyEnvironment(scene, preset.environment ?? {}, activeEnvironmentController);
};
previewSceneButton?.addEventListener("click", () => {
  toggleScenePreview().catch(error => {
    console.warn("Scene Preview failed:", error);
    scenePreviewUi.previewName = null;
    updateScenePreviewUi();
    applyCurrentSlideSceneState().catch(console.warn);
  });
});
hideEditorSlidesCheckbox?.addEventListener("change", event => { scenePreviewUi.hiddenSlides = event.target.checked; scenePreviewUi.guidesSignature = null; });
hideSlideObjectsCheckbox?.addEventListener('change', event => { scenePreviewUi.hideSlideObjects = Boolean(event.target.checked); scenePreviewUi.guidesSignature = null; if (scenePreviewUi.hideSlideObjects) detachSlideGizmo(); else refreshCurrentSlideGizmoAfterTransform(); refreshSharedTransformControls(); });
hideSceneAssetsCheckbox?.addEventListener('change', event => {
  scenePreviewUi.hideAssets = Boolean(event.target.checked);
  scenePreviewUi.guidesSignature = null;
  if (scenePreviewUi.hideAssets) { scene2fClearAssetSelection(); canvasSelectedAssetIds.clear(); selectedSceneAssetId = null; syncEditingSceneAssetGizmo(); refreshSceneAssetEditor(); }
});
showAllScenesCheckbox?.addEventListener('change', async event => {
  scenePreviewUi.allScenes = Boolean(event.target.checked);
  scenePreviewUi.guidesSignature = null;
  if (scenePreviewUi.allScenes && isEditorMode() && scene && currentProjectData) {
    const project = currentProjectData, targetScene = scene;
    const names = Object.keys(project.scenePresets ?? {});
    // Lazy-load non-current Scene assets without activating their environment.
    for (const name of names) {
      if (!scenePreviewUi.allScenes || currentProjectData !== project || scene !== targetScene) break;
      try { await ensureScenePresetLoaded(targetScene, { scenePreset:name }); }
      catch (error) { console.warn('All Scenes asset load failed:', name, error); }
    }
  }
  if (!scenePreviewUi.allScenes) scene2fClearAssetSelection();
  if (!scenePreviewUi.allScenes && editingScenePresetName !== activeScenePresetName) {
    canvasSelectedAssetIds.clear();
    selectedSceneAssetId = null;
    editingScenePresetName = activeScenePresetName;
    refreshEditingScenePresetSelector();
    refreshSceneAssetEditor();
  }
  scenePreviewUi.guidesSignature = null;
  refreshEditorVisualGuides();
  syncEditingSceneAssetGizmo();
});
showSlidePositionsCheckbox?.addEventListener("change", event => { scenePreviewUi.positions = event.target.checked; scenePreviewUi.guidesSignature = null; });
showCameraPathCheckbox?.addEventListener("change", event => { scenePreviewUi.cameraPath = event.target.checked; scenePreviewUi.guidesSignature = null; });
showCameraPositionsCheckbox?.addEventListener("change", event => { scenePreviewUi.cameraPositions = event.target.checked; scenePreviewUi.guidesSignature = null; });

const refreshEditorVisualGuides = () => {
  if (!scene) return;
  const targetScene = scene;
  const editorVisible = isEditorMode();
  const signature = [editorVisible, scenePreviewUi.hiddenSlides, scenePreviewUi.hideSlideObjects, scenePreviewUi.hideAssets, scenePreviewUi.allScenes, Boolean(scenePreviewUi.previewName),
    scenePreviewUi.positions, scenePreviewUi.cameraPath, scenePreviewUi.cameraPositions,
    [...scene2oHiddenSlideIds].sort().join(','),
    [...scene2oHiddenAssetIds].map(([name,ids])=>`${name}:${[...ids].sort().join(',')}`).sort().join('|'),
    getEditorGuideSignature(slideStates),
    slideStates.map(state=>`${state.id}:${state.transparentInPresentation === true}`).join(',')].join('|');
  if (scenePreviewUi.guidesScene === targetScene && scenePreviewUi.guidesSignature === signature) return;
  for (const mesh of scenePreviewUi.guideMeshes) if (!mesh.isDisposed()) mesh.dispose(false, true);
  scenePreviewUi.guideMeshes = [];
  scenePreviewUi.guidesScene = targetScene;
  scenePreviewUi.guidesSignature = signature;
  for (const state of slideStates) {
    if (!state.mesh || state.mesh.isDisposed()) continue;
    const fullyHidden = editorVisible && (scenePreviewUi.hideSlideObjects || Boolean(scenePreviewUi.previewName));
    const imageHidden = editorVisible && scenePreviewUi.hiddenSlides;
    const individuallyHidden = editorVisible && scene2oIsSlideHidden(state.id);
    state.mesh.isVisible = !fullyHidden && !individuallyHidden && isSlidePlaneVisible(state, !editorVisible);
    state.mesh.isPickable = !fullyHidden && !individuallyHidden;
    // Image-only hiding leaves a virtually transparent, selectable slide surface.
    state.mesh.visibility = imageHidden ? 0.00001 : 1;
  }
  for (const [name, cached] of scenePresetAssetCache) {
    const hidden = editorVisible && scenePreviewUi.hideAssets;
    const showAll = editorVisible && scenePreviewUi.allScenes && !scenePreviewUi.previewName;
    const showPreset = !hidden && (name === activeScenePresetName || showAll) &&
      (!scenePreviewUi.previewName || name === activeScenePresetName);
    for (const loaded of cached.assets ?? []) {
      setLoadedAssetVisible(loaded,showPreset && !(editorVisible && scene2oIsAssetHidden(name,loaded.config?.id)));
    }
  }
  if (!editorVisible) return;
  if (scenePreviewUi.positions) {
    for (const state of slideStates) {
      if (!state.position) continue;
      const marker = MeshBuilder.CreateSphere(`editor-slide-position-${state.id}`, {diameter:0.17,segments:8}, targetScene);
      marker.position.copyFrom(state.position);
      marker.isPickable = false;
      const mat = new StandardMaterial(`editor-slide-position-material-${state.id}`,targetScene);
      mat.disableLighting = true;
      mat.emissiveColor = new Color3(0.15,0.86,1);
      marker.material = mat;
      scenePreviewUi.guideMeshes.push(marker);
    }
  }
  if (scenePreviewUi.cameraPositions) {
    for (const state of slideStates) {
      if (!state.cameraPosition) continue;
      const marker = MeshBuilder.CreateSphere(`editor-camera-position-${state.id}`, {diameter:0.2,segments:10}, targetScene);
      marker.position.copyFrom(state.cameraPosition);
      marker.isPickable = false;
      const material = new StandardMaterial(`editor-camera-position-material-${state.id}`, targetScene);
      material.disableLighting = true;
      material.emissiveColor = new Color3(1,0.58,0.12);
      marker.material = material;
      scenePreviewUi.guideMeshes.push(marker);
    }
  }
  const points = slideStates.map(state=>state.cameraPosition).filter(Boolean);
  if (scenePreviewUi.cameraPath && points.length >= 2) {
    const line = MeshBuilder.CreateLines('editor-camera-path', {points,updatable:false},targetScene);
    line.color = new Color3(1,0.68,0.12);
    line.isPickable = false;
    scenePreviewUi.guideMeshes.push(line);
  }
};
updateScenePreviewUi();
onLanguageChange(updateScenePreviewUi);

// Scene-1V: a Scene can exist without a Slide. The creation dialog makes
// the relationship explicit; choosing "scene only" never changes Current.
const requestNewScenePlacement = function ({ duplicate = false } = {}) {
  return new Promise(resolve => {
    const dialog = document.createElement("dialog");
    dialog.className = "scene-create-dialog";
    dialog.setAttribute("aria-label", t(duplicate ? "Duplicate Scene Preset" : "New Scene Preset"));
    const heading = document.createElement("h3");
    heading.textContent = t(duplicate ? "Duplicate Scene Preset" : "New Scene Preset");
    const description = document.createElement("p");
    description.textContent = t(duplicate ? "Choose how to use the duplicated Scene" : "Choose how to use the new Scene");
    const options = document.createElement("div");
    options.className = "scene-create-options";
    const variants = [
      ["new-slide", "Create a new Slide using this Scene"],
      ["current", "Apply to Current Slide"],
      ["scene-only", "Create Scene only (use later)"],
    ];
    const group = `new-scene-placement-${Date.now()}`;
    for (const [value, label] of variants) {
      const row = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = group;
      radio.value = value;
      radio.checked = value === (slideStates.length ? "new-slide" : "scene-only");
      if (value === "current" && !getCurrentSlideState()) radio.disabled = true;
      const caption = document.createElement("span");
      caption.textContent = t(label);
      row.append(radio, caption);
      options.append(row);
    }
    const actions = document.createElement("div");
    actions.className = "scene-create-dialog-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = t("Cancel");
    const create = document.createElement("button");
    create.type = "button";
    create.textContent = t(duplicate ? "Duplicate" : "Create");
    actions.append(cancel, create);
    dialog.append(heading, description, options, actions);
    document.body.append(dialog);
    let result = null;
    const finish = value => { result = value; dialog.close(); };
    cancel.addEventListener("click", () => finish(null));
    create.addEventListener("click", () => {
      finish(dialog.querySelector('input[type="radio"]:checked')?.value ?? "scene-only");
    });
    dialog.addEventListener("close", () => { dialog.remove(); resolve(result); }, { once: true });
    dialog.showModal();
  });
};

createScenePresetButton.addEventListener("click", async () => {
  if (!currentProjectData || projectOperationBusy || isPresentationMode()) return;
  const project = currentProjectData;
  const placement = await requestNewScenePlacement();
  if (!placement || project !== currentProjectData || projectOperationBusy || isPresentationMode()) return;
  const settingsEdit = beginSettingsEdit();
  try {
    currentProjectData.scenePresets ??= {};
    const name = createUniqueScenePresetName("scene");
    currentProjectData.scenePresets[name] = createDefaultScenePreset();
    editingScenePresetName = name;
    if (placement === "current" && getCurrentSlideState()) {
      // A single settings transaction includes both Scene creation and assignment.
      await assignScenePresetToCurrentSlide(name);
    }
    selectEditingScenePreset(name);
    finishSettingsEdit(settingsEdit);
    if (placement === "new-slide") {
      // Uses existing blank-slide creation, Undo/Redo and camera placement.
      await recordCurrentSlide({ blank: true, placement: "after" });
      selectEditingScenePreset(name);
    } else if (placement === "current") {
      refreshCurrentSlideEditorUi();
      renderSlideThumbnails();
    }
  } catch (error) {
    console.error("ScenePreset create failed:", error);
    showAppNotice("Scene Presetの作成に失敗しました。", {level:"error"});
  }
});

document.getElementById("applyUnusedSceneToCurrent")?.addEventListener("click", async () => {
  if (!currentProjectData || !getCurrentSlideState() || !currentProjectData.scenePresets?.[editingScenePresetName]) return;
  const name = editingScenePresetName;
  const edit = beginSettingsEdit();
  await assignScenePresetToCurrentSlide(name);
  finishSettingsEdit(edit);
  selectEditingScenePreset(name);
  refreshCurrentSlideEditorUi();
  renderSlideThumbnails();
});

document.getElementById("addSlideForUnusedScene")?.addEventListener("click", async () => {
  if (!currentProjectData?.scenePresets?.[editingScenePresetName] || projectOperationBusy || isPresentationMode()) return;
  const name = editingScenePresetName;
  await recordCurrentSlide({ blank: true, placement: "after" });
  selectEditingScenePreset(name);
  refreshEditingScenePresetSelector();
});

duplicateScenePresetButton.addEventListener("click", async () => {
  if (!currentProjectData || projectOperationBusy || isPresentationMode()) return;
  const project = currentProjectData;
  const sourceName = editingScenePresetName;
  if (!project.scenePresets?.[sourceName]) return;
  const placement = await requestNewScenePlacement({ duplicate: true });
  if (!placement || currentProjectData !== project || projectOperationBusy || isPresentationMode()
      || !project.scenePresets?.[sourceName]) return;
  const edit = beginSettingsEdit();
  try {
    const newName = createUniqueScenePresetName(sourceName);
    project.scenePresets[newName] = structuredClone(project.scenePresets[sourceName]);
    editingScenePresetName = newName;
    if (placement === "current" && getCurrentSlideState()) {
      await assignScenePresetToCurrentSlide(newName);
    }
    selectEditingScenePreset(newName);
    finishSettingsEdit(edit);
    if (placement === "new-slide") {
      await recordCurrentSlide({ blank: true, placement: "after" });
      selectEditingScenePreset(newName);
    } else if (placement === "current") {
      refreshCurrentSlideEditorUi();
      renderSlideThumbnails();
    }
  } catch (error) {
    console.error("ScenePreset duplicate failed:", error);
    showAppNotice(t("Scene duplication failed"), { level: "error" });
  }
});

renameScenePresetButton.addEventListener("click", async () => {
  if (!currentProjectData) {
    return;
  }

  const oldName = editingScenePresetName;

  if (!oldName || oldName === "default") {
    return;
  }

  if (scenePresetLoadPromises.has(oldName)) {
    showAppNotice("ScenePresetのロード完了後に名前を変更してください。", {
      level: "warning",
      key: "scene-preset-rename-loading",
    });
    return;
  }

  const renameProject = currentProjectData;
  const rawName = await requestPresetName({
    initialName: oldName,
    normalize: normalizePresetName,
    isAvailable: name => name === oldName || isScenePresetNameAvailable(name),
  });
  // A project/preset switch while the dialog is open must not rename stale data.
  if (currentProjectData !== renameProject || editingScenePresetName !== oldName || scenePresetLoadPromises.has(oldName)) return;

  if (rawName === null) {
    return;
  }

  const newName = normalizePresetName(rawName);

  if (!newName || newName === oldName) {
    return;
  }

  if (!isScenePresetNameAvailable(newName)) {
    window.alert(t("そのScenePreset名は既に存在します。"));

    return;
  }

  const preset = getScenePresetSafe(currentProjectData, oldName);

  if (!preset) {
    return;
  }

  // 新しい名前へ移動
  const settingsEdit = beginSettingsEdit();
  currentProjectData.scenePresets[newName] = preset;

  delete currentProjectData.scenePresets[oldName];

  for (const state of slideStates) {
    if (state.scenePreset === oldName) {
      state.scenePreset = newName;
    }
  }
  if (scenePresetAssetCache.has(oldName)) {
    const cached = scenePresetAssetCache.get(oldName);

    scenePresetAssetCache.delete(oldName);

    cached.presetName = newName;

    scenePresetAssetCache.set(newName, cached);
  }

  if (activeScenePresetName === oldName) {
    activeScenePresetName = newName;
  }

  refreshSceneAssetEditor();

  selectEditingScenePreset(newName);
  finishSettingsEdit(settingsEdit);
});

// Scene-1W: consistent theme-aware modal instead of window.confirm.
const requestDeleteScenePreset = function (presetName, usedCount) {
  return new Promise(resolve => {
    const dialog = document.createElement("dialog");
    dialog.className = "scene-create-dialog";
    dialog.setAttribute("aria-label", t("Delete Scene Preset"));
    const heading = document.createElement("h3");
    heading.textContent = t("Delete Scene Preset");
    const name = document.createElement("p");
    name.textContent = presetName;
    const description = document.createElement("p");
    description.textContent = usedCount > 0
      ? t("Scene delete referenced slides").replace("{count}", String(usedCount))
      : t("Scene delete unused");
    const actions = document.createElement("div");
    actions.className = "scene-create-dialog-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = t("Cancel");
    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "scene-delete-confirm";
    confirm.textContent = t("Delete");
    actions.append(cancel, confirm);
    dialog.append(heading, name, description, actions);
    document.body.append(dialog);
    let accepted = false;
    cancel.addEventListener("click", () => dialog.close());
    confirm.addEventListener("click", () => { accepted = true; dialog.close(); });
    dialog.addEventListener("close", () => { dialog.remove(); resolve(accepted); }, {once:true});
    dialog.showModal();
  });
};

deleteScenePresetButton.addEventListener("click", async () => {
  if (!currentProjectData) {
    return;
  }

  const presetName = editingScenePresetName;

  if (!presetName) {
    return;
  }

  if (presetName === "default") {
    window.alert(t("default ScenePresetは削除できません。"));

    return;
  }
  const usedCount = countSlidesUsingScenePreset(presetName);

  const deleteProject = currentProjectData;
  const ok = await requestDeleteScenePreset(presetName, usedCount);
  if (deleteProject !== currentProjectData || !currentProjectData?.scenePresets?.[presetName]
      || projectOperationBusy || isPresentationMode()) return;

  if (!ok) {
    return;
  }

  const settingsEdit = beginSettingsEdit();
  for (const state of slideStates) {
    if (state.scenePreset === presetName) {
      state.scenePreset = "default";
    }
  }

  detachAssetGizmo();

  selectedSceneAssetId = null;
  const cachedPreset = scenePresetAssetCache.get(presetName);

  if (cachedPreset) {
    for (const loadedAsset of cachedPreset.assets ?? []) {
      disposeLoadedSceneAsset(loadedAsset);
    }

    scenePresetAssetCache.delete(presetName);
  }
  sceneAssetRuntimeGeneration++;
  scenePresetLoadPromises.delete(presetName);
  delete currentProjectData.scenePresets[presetName];
  editingScenePresetName = "default";
  finishSettingsEdit(settingsEdit);

  if (activeScenePresetName === presetName) {
    activeScenePresetName = null;
  }

  const currentSlide = getCurrentSlideState();

  if (currentSlide) {
    await activateScenePreset(currentSlide);

    await applyCurrentEnvironment();
  }

  // refreshSlideSettingsInspector();

  refreshSceneAssetEditor();

  // renderTable();

  selectEditingScenePreset("default");
});

// Scene environment and slide override editing share one settings transaction per gesture.
for (const [control, field] of [[turbiditySlider, "turbidity"], [inclinationSlider, "inclination"], [azimuthSlider, "azimuth"], [fogDensitySlider, "fogDensity"]]) {
  let edit = null;
  let environment = null;
  bindSliderCommitInput(control, {
    read: () => { edit = beginSettingsEdit(); environment = getEditableEnvironment(); return Number(environment?.[field] ?? getEnvironmentForEditorDisplay()[field] ?? control.value); },
    preview: value => { if (!edit || edit.project !== currentProjectData || !environment) return; environment[field] = value; void applyCurrentEnvironment(); },
    commit: () => { finishSettingsEdit(edit); edit = null; refreshSlideSettingsInspector(); },
    cancel: () => {
      if (edit?.project === currentProjectData) {
        const changes = diffSettings(edit.before, captureSettings(currentProjectData, slideStates, presentationSettings));
        applySettingsPatch({project: currentProjectData, presentation: presentationSettings, slides: Object.fromEntries(slideStates.map(slide => [slide.id, slide]))}, changes, "before");
        void applyCurrentEnvironment();
      }
      edit = null; syncEnvironmentUi(getEnvironmentForEditorDisplay());
    },
  });
}
// Numeric Environment controls share Scene/Slide environment and history logic.
for (const [field, slider] of [['turbidity',turbiditySlider],['inclination',inclinationSlider],['azimuth',azimuthSlider],['fogDensity',fogDensitySlider]]) {
  const number = document.getElementById(`${field}Number`);
  if (!number) continue;
  const restore = () => { number.value = String(getEnvironmentForEditorDisplay()?.[field] ?? slider.value); };
  number.addEventListener('change', () => {
    if (!number.value.trim()) {restore();return;}
    const value = Number(number.value);
    if (!Number.isFinite(value) || value < Number(slider.min) || value > Number(slider.max)) {restore();return;}
    const edit = beginSettingsEdit();
    const environment = getEditableEnvironment();
    if (!edit || !environment) {restore();return;}
    environment[field] = value;
    finishSettingsEdit(edit);
    slider.value = String(value);
    void applyCurrentEnvironment();
    refreshSlideSettingsInspector();
  });
  number.addEventListener('keydown', event => {
    if (event.key === 'Enter') {event.preventDefault();number.blur();}
    if (event.key === 'Escape') {event.preventDefault();event.stopPropagation();restore();number.blur();}
  });
}
// Native color pickers commit once on change, instead of recording every preview.
fogColorPicker.addEventListener("change", () => {
  const edit = beginSettingsEdit();
  const environment = getEditableEnvironment();
  if (!edit || !environment) return;
  environment.fogColor = hexToColorArray(fogColorPicker.value);
  finishSettingsEdit(edit);
  void applyCurrentEnvironment();
});

environmentSlideOverrideCheckbox?.addEventListener("change", () => {
  (environmentSlideOverrideCheckbox.checked ? editEnvironmentOverrideButton : editEnvironmentPresetButton).click();
});
editEnvironmentPresetButton.addEventListener("click", () => {
  environmentEditTarget = "preset";

  refreshEnvironmentEditTargetUi();

  const environment = getEnvironmentForEditorDisplay();

  syncEnvironmentUi(environment);

  syncSkyboxEditorFromEnvironment();
});

editEnvironmentOverrideButton.addEventListener("click", () => {
  environmentEditTarget = "override";

  refreshEnvironmentEditTargetUi();

  const environment = getEnvironmentForEditorDisplay();

  syncEnvironmentUi(environment);

  syncSkyboxEditorFromEnvironment();
});

// Selecting a complete Skybox Set applies it immediately to the active
// Scene or Slide environment. This replaces the former Apply Skybox button.
skyboxSetSelector.addEventListener("change", async () => {
  refreshSelectedSkyboxSetInfo();
  const set = getSelectedDetectedSkyboxSet();
  if (!set) return;

  const edit = beginSettingsEdit();
  const environment = getEditableEnvironment();
  if (!edit || !environment) return;
  environment.skybox = structuredClone(set.skybox);
  environment.useSkybox = true;
  finishSettingsEdit(edit);

  try {
    await applyCurrentEnvironment();
    syncSkyModeControls();
    refreshSlideSettingsInspector();
    skyboxEditorStatus.textContent = `${set.name || t('Current unregistered skybox')} ${t('Skybox applied')}`;
  } catch (error) {
    console.error("Skybox application failed:", error);
    skyboxEditorStatus.textContent = "Skybox適用に失敗しました";
  }
});

duplicateSlideButton.addEventListener("click", () => executeSlideCommand("duplicate"));

deleteSlideButton.addEventListener("click", () => executeSlideCommand("delete"));

moveSlideEarlierButton.addEventListener("click", () => executeSlideCommand("move-left"));

moveSlideLaterButton.addEventListener("click", () => executeSlideCommand("move-right"));

applySlideImageIdButton.addEventListener("click", async () => {
  const slideState = getCurrentSlideState();
  if (!slideState || projectOperationBusy || isPresentationMode()) return;
  const raw = slideImageIdInput.value.trim();
  const imageId = Number(raw);
  if (raw && (!Number.isSafeInteger(imageId) || imageId < 0)) return;
  try {
    const imagePath = raw ? ((await resolveSlideImagePathFromId(imageId)) ?? `slides/Slide${imageId}.png`) : null;
    const before = slideState.imagePath;
    if (normalizeSlideImagePath(before) === normalizeSlideImagePath(imagePath) &&
        (!imagePath || slideState.activeImageUrl)) return;
    if (await changeSlideImage(slideState, imagePath)) {
      recordSlideImageHistory(slideState, before, imagePath);
      refreshCurrentSlidePropertiesUi();
      renderSlideThumbnails();
      renderTable();
      scheduleProjectStatusRefresh();
    }
  } catch (error) {
    console.error('Slide image assignment failed:', error);
    showAppNotice(t('Slide image import failed'), {level:'error'});
  }
});

// Scene-4A: import the chosen image into the opened project. Never overwrite
// another slide's file: old images must remain available for Undo/Redo.
const importChosenSlideImage = async (file, slideState) => {
  if (!slideState || !file) return false;
  const extension = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();
  const allowed = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
  if (!extension || !allowed[extension] || (file.type && file.type !== allowed[extension])) {
    showAppNotice(t('Unsupported slide image format'), { level: 'warning' });
    return false;
  }
  const projectHandle = currentProjectDirectoryHandle;
  const projectData = currentProjectData;
  if (!projectHandle || !projectData) {
    showAppNotice(t('Open a project folder before choosing an image'), { level: 'warning' });
    return false;
  }
  const slideId = slideState.id;
  const previousPath = slideState.imagePath;
  const folder = await projectHandle.getDirectoryHandle('slides', { create: true });
  if (projectHandle !== currentProjectDirectoryHandle || projectData !== currentProjectData || !slideStates.includes(slideState)) return false;
  const basename = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 70) || 'image';
  const stem = `slide-${slideId}-${basename}`;
  let filename = `${stem}.${extension}`;
  let suffix = 2;
  while (true) {
    try { await folder.getFileHandle(filename); filename = `${stem}-${suffix++}.${extension}`; }
    catch (error) { if (error?.name === 'NotFoundError') break; throw error; }
  }
  const handle = await folder.getFileHandle(filename, { create: true });
  const writable = await handle.createWritable();
  try { await writable.write(file); await writable.close(); }
  catch (error) { await writable.abort().catch(() => {}); throw error; }
  // User may have switched projects while the browser was writing the file.
  if (projectHandle !== currentProjectDirectoryHandle || projectData !== currentProjectData || !slideStates.includes(slideState)) return false;
  const imagePath = `slides/${filename}`;
  const changed = await changeSlideImage(slideState, imagePath);
  if (!changed) return false;
  recordSlideImageHistory(slideState, previousPath, imagePath);
  refreshCurrentSlidePropertiesUi();
  renderSlideThumbnails();
  renderTable();
  return true;
};

chooseSlideImageButton?.addEventListener('click', () => {
  if (!getCurrentSlideState()) return;
  if (!currentProjectDirectoryHandle) {
    showAppNotice(t('Open a project folder before choosing an image'), { level: 'warning' });
    return;
  }
  slideImageFileInput.value = '';
  slideImageFileInput.click();
});
slideImageFileInput?.addEventListener('change', async () => {
  const file = slideImageFileInput.files?.[0];
  const slideState = getCurrentSlideState();
  if (!file || !slideState) return;
  chooseSlideImageButton.disabled = true;
  try { await importChosenSlideImage(file, slideState); }
  catch (error) {
    console.error('Slide image import failed:', error);
    showAppNotice(t('Slide image import failed'), { level: 'warning' });
  } finally {
    chooseSlideImageButton.disabled = !getCurrentSlideState();
    slideImageFileInput.value = '';
  }
});

// Assign consecutive IDs to selected slides, in presentation order.
// Missing files still produce an image reference, and the entire operation
// is a single Undo / Redo item (including restoring unassigned images).
document.getElementById('applySequentialSlideImageIds')?.addEventListener('click', async () => {
  if (!currentProjectData || projectOperationBusy || isPresentationMode()) return;
  const field = document.getElementById('slideImageIdStart');
  const first = Number(field?.value);
  if (!Number.isSafeInteger(first) || first < 0) return;
  const ordered = slideStates.filter(slide => selectedSlideIds.has(slide.id));
  if (!ordered.length) {
    showAppNotice(t('Select slides first'), {level:'warning'});
    return;
  }
  const button = document.getElementById('applySequentialSlideImageIds');
  const project = currentProjectData;
  button.disabled = true;
  const changes = [];
  let missingCount = 0;
  try {
    for (let i = 0; i < ordered.length; i++) {
      if (project !== currentProjectData) break;
      const slide = ordered[i];
      const number = first + i;
      const match = await resolveSlideImagePathFromId(number);
      const path = match ?? `slides/Slide${number}.png`;
      if (!match) missingCount++;
      const previous = normalizeSlideImagePath(slide.imagePath);
      if (previous === path) continue;
      if (await changeSlideImage(slide, path)) {
        changes.push({slideId: slide.id, beforeImagePath: previous, afterImagePath: path});
      }
    }
    if (changes.length && project === currentProjectData) {
      pushEditorHistory({type:'slide-image-batch', changes});
    }
    refreshCurrentSlidePropertiesUi();
    renderSlideThumbnails();
    renderTable();
    scheduleProjectStatusRefresh();
    showAppNotice(`${t('Images assigned')}: ${changes.length} / ${ordered.length} (${t('Images not found')}: ${missingCount})`);
  } catch (error) {
    console.error('Sequential image assignment failed', error);
    showAppNotice(t('Slide image import failed'), {level:'error'});
  } finally { button.disabled = false; }
});

slideImageIdInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();

  applySlideImageIdButton.click();
});

placeSlideInFrontOfCameraButton?.addEventListener("click", () => {
  placeCurrentSlideInFrontOfCameraWithHistory();
});

slideLabelInput.addEventListener("focus", () => {
  const slideState = getCurrentSlideState();

  if (!slideState) {
    slideLabelBeforeEdit = null;

    return;
  }

  slideLabelBeforeEdit = slideState.label ?? "";
});

slideLabelInput.addEventListener("input", () => {
  const slideState = getCurrentSlideState();

  if (!slideState) {
    return;
  }

  slideState.label = slideLabelInput.value;

  renderTable();

  renderSlideThumbnails();
});

slideLabelInput.addEventListener("change", () => {
  const slideState = getCurrentSlideState();

  if (!slideState || slideLabelBeforeEdit === null) {
    return;
  }

  recordSlideLabelHistory(slideState, slideLabelBeforeEdit, slideState.label);

  slideLabelBeforeEdit = null;
});

// Step 12K-2C: selecting a preset is an explicit, undoable edit.
for (const [selectElement, propertyName] of [
  [multiScenePresetSelect, "scenePreset"],
  [multiTransitionPresetSelect, "transitionPreset"],
  [multiSoundPresetSelect, "soundPreset"],
]) {
  selectElement.addEventListener("change", () => {
    const presetName = selectElement.value;
    if (!presetName || getSlideInspectorTargetEntries().length === 0) return;
    void applyPresetToInspectorTargets(propertyName, presetName);
  });
}

multiGatherButton.addEventListener("click", async () => {
  await gatherSelectedSlides();
});

multiMoveToStartButton.addEventListener("click", async () => {
  await moveSelectedSlidesToStart();
});

multiMoveToEndButton.addEventListener("click", async () => {
  await moveSelectedSlidesToEnd();
});


multiUseSkyboxSelect.addEventListener("change", async () => {
  const raw = multiUseSkyboxSelect.value;

  if (raw !== "true" && raw !== "false") {
    return;
  }

  await applyEnvironmentOverrideToInspectorTargets(
    "useSkybox",
    raw === "true",
    {
      dirtyFieldKey: "environment:useSkybox",
    },
  );
});

multiFogColorInput.addEventListener("change", async () => {
  const color = hexToColorArray(multiFogColorInput.value);

  if (!color) {
    return;
  }

  await applyEnvironmentOverrideToInspectorTargets("fogColor", color, {
    dirtyFieldKey: "environment:fogColor",
  });
});

multiClearEnvironmentOverridesButton.addEventListener("click", async () => {
  const changed = await clearEnvironmentOverridesFromInspectorTargets();
  if (!changed) {
    const slide = getCurrentSlideState();
    if (slide && Object.keys(slide.environmentOverride ?? {}).length > 0) {
      const edit = beginSettingsEdit();
      slide.environmentOverride = {};
      finishSettingsEdit(edit);
      await applyCurrentEnvironment();
      refreshSlideSettingsInspector();
      syncSlideEnvironmentEditor();
    }
  }
  refreshMultiSlideActionButtons();
});




// Step 12K-2A: numeric/color overrides commit through their own input handlers.
// No separate Pending draft is registered during typing.

// Scene-1C: Explicit enable switches leave override values intact, so the
// user can temporarily inherit Scene defaults without losing their tuning.
async function setSlideOverrideEnabled(kind, enabled) {
  const entries = getSlideInspectorTargetEntries();
  if (!entries.length) return;
  const key = kind === "transition" ? "transitionOverrideEnabled" : "soundOverrideEnabled";
  const changes = [];
  for (const {slideState} of entries) {
    const before = slideState[key];
    if (before === enabled) continue;
    changes.push({slideId:slideState.id, before, after:enabled});
    slideState[key] = enabled;
  }
  if (changes.length) {
    pushEditorHistory({type:"scene1c-override-toggle", key, changes});
    await refreshAfterMultiPropertyBatch(changes);
  }
  refreshMultiTransitionOverrideControls();
  refreshMultiSoundOverrideControls();
}
slideTransitionUseOverride?.addEventListener("change", () => setSlideOverrideEnabled("transition", slideTransitionUseOverride.checked));
slideSoundUseOverride?.addEventListener("change", () => setSlideOverrideEnabled("sound", slideSoundUseOverride.checked));
for (const [kind,control] of [["transition",slideTransitionMode],["sound",slideSoundMode]]) {
  control.addEventListener("change", async () => {
    if (!["preset","custom"].includes(control.value)) return;
    const entries=getSlideInspectorTargetEntries();
    if(!entries.length) return;
    const edit=beginSettingsEdit();
    for(const {slideState} of entries) {
      slideState[`${kind}OverrideMode`]=control.value;
      slideState[`${kind}OverrideEnabled`]=true;
    }
    finishSettingsEdit(edit);
    await refreshAfterMultiPropertyBatch(entries.map(({slideState})=>({slideId:slideState.id})));
    refreshSharedPresetControls();
    refreshMultiTransitionOverrideControls();
    refreshMultiSoundOverrideControls();
  });
}


multiClearTransitionOverridesButton.addEventListener("click", async () => {
  await clearTransitionOverridesFromInspectorTargets();
});

// Sound Override selections are committed immediately. Each selection creates
// one existing slide-sound-override-batch history entry when the value changes.
// The apply helper refreshes controls after completion and ignores mixed values.
for (const [selectElement, propertyName] of [
  [multiPreviousSoundSelect, "previous"],
  [multiCurrentSoundSelect, "current"],
  [multiNextSoundSelect, "next"],
]) {
  selectElement.addEventListener("change", async () => {
    await applySoundOverrideFromSelect(selectElement, propertyName);
  });
}

multiClearSoundOverridesButton.addEventListener("click", async () => {
  await clearSoundOverridesFromInspectorTargets();
});







multiEnvironmentSectionToggle.addEventListener("click", () => {
  toggleSharedInspectorSection("environment");
});

multiTransitionSectionToggle.addEventListener("click", () => {
  toggleSharedInspectorSection("transition");
});

multiSoundSectionToggle.addEventListener("click", () => {
  toggleSharedInspectorSection("sound");
});

multiExpandAllSectionsButton.addEventListener("click", () => {
  setWorkspacePanelExpanded(document.getElementById("workspace-slides"), true);
});

multiCollapseAllSectionsButton.addEventListener("click", () => {
  setWorkspacePanelExpanded(document.getElementById("workspace-slides"), false);
});


multiTransformSectionToggle.addEventListener("click", () => {
  toggleSharedInspectorSection("transform");
});


multiApplyPositionXDeltaButton.addEventListener("click", async () => {
  const delta = Number(multiPositionXDeltaInput.value);

  await offsetSelectedSlidesPositionAxis("x", delta);
});


multiApplyPositionYDeltaButton.addEventListener("click", async () => {
  const delta = Number(multiPositionYDeltaInput.value);

  await offsetSelectedSlidesPositionAxis("y", delta);
});


multiApplyPositionZDeltaButton.addEventListener("click", async () => {
  const delta = Number(multiPositionZDeltaInput.value);

  await offsetSelectedSlidesPositionAxis("z", delta);
});


multiApplyRotationPitchDeltaButton.addEventListener("click", async () => {
  await offsetSelectedSlidesRotationAxis(
    "pitch",
    Number(multiRotationPitchDeltaInput.value),
  );
});


multiApplyRotationYawDeltaButton.addEventListener("click", async () => {
  await offsetSelectedSlidesRotationAxis(
    "yaw",
    Number(multiRotationYawDeltaInput.value),
  );
});


multiApplyRotationRollDeltaButton.addEventListener("click", async () => {
  await offsetSelectedSlidesRotationAxis(
    "roll",
    Number(multiRotationRollDeltaInput.value),
  );
});

multiApplyCameraDistanceDeltaButton.addEventListener("click", async () => {
  const delta = Number(multiCameraDistanceDeltaInput.value);

  await offsetSelectedSlidesCameraDistance(delta);
});


// Presentation
presentButton.addEventListener("click", async () => {
  await togglePresentationMode();
});

presentationStartMode?.addEventListener(
  "change",
  applyPresentationSettingsFromUi,
);

presentationLoop?.addEventListener("change", applyPresentationSettingsFromUi);

presentationAutoFullscreen?.addEventListener(
  "change",
  applyPresentationSettingsFromUi,
);

presentationHudMode?.addEventListener(
  "change",
  applyPresentationSettingsFromUi,
);

presentationTimeMode?.addEventListener(
  "change",
  applyPresentationSettingsFromUi,
);

presentationControls?.addEventListener("mouseenter", () => {
  if (!isPresentationMode()) {
    return;
  }

  showPresentationControls({
    autoHide: false,
  });
});

presentationControls?.addEventListener("mouseleave", () => {
  if (!isPresentationMode()) {
    return;
  }

  if (presentationControlsPinned || presentationSlideJumpEditing || presentationProgressScrubbing) {
    return;
  }

  clearPresentationControlsHideTimer();

  presentationControlsHideTimeoutId = window.setTimeout(() => {
    hidePresentationControls();
  }, PRESENTATION_CONTROLS_HIDE_DELAY_AFTER_FOCUSOUT);
});

presentationPreviousButton?.addEventListener("click", async () => {
  await previousSlide();

  refreshPresentationControls();

  showPresentationControls({
    autoHide: false,
  });
});

presentationNextButton?.addEventListener("click", async () => {
  await nextSlide();

  refreshPresentationControls();

  showPresentationControls({
    autoHide: false,
  });
});

presentationFullscreenButton?.addEventListener("click", async () => {
  await toggleFullscreen();

  showPresentationControls();
});

presentationExitButton?.addEventListener("click", async () => {
  await exitPresentationMode();
});

document.addEventListener("fullscreenchange", () => {
  refreshEditorFullscreenButton();
  refreshPresentationFullscreenButton();
});

presentationSlideJumpButton?.addEventListener("click", () => {
  beginPresentationSlideJump();
});

presentationSlideJumpInput?.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    event.preventDefault();

    event.stopPropagation();

    await commitPresentationSlideJump();

    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();

    event.stopPropagation();

    endPresentationSlideJump();

    refreshPresentationControls();

    showPresentationControls({
      autoHide: false,
    });
  }
});

presentationSlideJumpInput?.addEventListener("blur", async () => {
  if (!presentationSlideJumpEditing) {
    return;
  }

  await commitPresentationSlideJump();
});

presentationProgressTrack?.addEventListener("pointerdown", (event) => {
  event.preventDefault();

  beginPresentationProgressScrub(event);
});

presentationProgressTrack?.addEventListener("pointermove", (event) => {
  movePresentationProgressScrub(event);
});

presentationProgressTrack?.addEventListener("pointerup", async (event) => {
  await endPresentationProgressScrub(event);
});

presentationProgressTrack?.addEventListener("pointercancel", () => {
  presentationProgressScrubbing = false;

  presentationProgressPreviewIndex = -1;

  if (presentationProgressPreview) {
    presentationProgressPreview.hidden = true;
  }
});

presentationProgressTrack?.addEventListener("keydown", async (event) => {
  if (!isPresentationMode()) {
    return;
  }

  let targetIndex = currentSlideIndex;

  switch (event.key) {
    case "ArrowLeft":
      targetIndex = Math.max(0, currentSlideIndex - 1);
      break;

    case "ArrowRight":
      targetIndex = Math.min(slideStates.length - 1, currentSlideIndex + 1);
      break;

    case "Home":
      targetIndex = 0;
      break;

    case "End":
      targetIndex = slideStates.length - 1;
      break;

    default:
      return;
  }

  event.preventDefault();

  event.stopPropagation();

  if (targetIndex === currentSlideIndex) {
    return;
  }

  await navigateSlideToIndex(targetIndex);

  refreshPresentationControls();

  refreshPresentationHud();

  showPresentationControls({
    autoHide: false,
  });
});

presentationOverviewButton?.addEventListener("click", () => {
  togglePresentationOverview();
});

presentationOverviewGrid?.addEventListener("click", async (event) => {
  const card = event.target.closest(".presentation-overview-slide");

  if (!card) {
    return;
  }

  const targetIndex = Number.parseInt(card.dataset.slideIndex, 10);

  if (!Number.isInteger(targetIndex)) {
    return;
  }

  presentationOverviewFocusedIndex = targetIndex;

  await activatePresentationOverviewFocusedSlide();
});

presentationOverviewGrid?.addEventListener("pointermove", (event) => {
  const card = event.target.closest(".presentation-overview-slide");

  if (!card) {
    return;
  }

  const index = Number.parseInt(card.dataset.slideIndex, 10);

  if (!Number.isInteger(index) || index === presentationOverviewFocusedIndex) {
    return;
  }

  presentationOverviewFocusedIndex = index;

  presentationOverviewGrid
    .querySelectorAll(".presentation-overview-slide.keyboard-focus")
    .forEach((element) => {
      element.classList.remove("keyboard-focus");
    });

  card.classList.add("keyboard-focus");
});

presentationOverviewCloseButton?.addEventListener("click", () => {
  finishPresentationOverview();

  showPresentationControls({
    autoHide: false,
  });
});

presentationOverview?.addEventListener("click", (event) => {
  if (event.target !== presentationOverview) {
    return;
  }

  finishPresentationOverview();

  showPresentationControls({
    autoHide: false,
  });
});

presentationOverviewSearch?.addEventListener("input", () => {
  if (!presentationOverviewOpen) {
    return;
  }

  const filtered = getPresentationOverviewFilteredIndices();

  // =====================================
  // Keep Focus if still visible
  // =====================================

  if (filtered.includes(presentationOverviewFocusedIndex)) {
    // keep current focus
  } else if (filtered.includes(currentSlideIndex)) {
    presentationOverviewFocusedIndex = currentSlideIndex;
  } else {
    presentationOverviewFocusedIndex = filtered[0] ?? -1;
  }

  renderPresentationOverview();
});

presentationOverviewSearch?.addEventListener("keydown", async (event) => {
  // =====================================
  // Enter
  // =====================================

  if (event.key === "Enter") {
    event.preventDefault();

    event.stopPropagation();

    await activatePresentationOverviewFocusedSlide();

    return;
  }

  // =====================================
  // Arrow Down
  // Search -> Grid
  // =====================================

  if (event.key === "ArrowDown") {
    event.preventDefault();

    event.stopPropagation();

    presentationOverviewSearch.blur();

    if (presentationOverviewFocusedIndex < 0) {
      presentationOverviewFocusedIndex =
        presentationOverviewFilteredIndices[0] ?? -1;
    }

    renderPresentationOverview();

    return;
  }

  // =====================================
  // Escape
  // Clear Search First
  // =====================================

  if (event.key === "Escape" && presentationOverviewSearch.value) {
    event.preventDefault();

    event.stopPropagation();

    presentationOverviewSearch.value = "";

    presentationOverviewFocusedIndex = currentSlideIndex;

    renderPresentationOverview();
  }
});

presentationAutoPlayOnStart?.addEventListener(
  "change",
  applyPresentationSettingsFromUi,
);

bindNumericCommitInput(presentationAutoPlayInterval, {
  commit: () => applyPresentationSettingsFromUi({target:presentationAutoPlayInterval}),
  restore: refreshPresentationSettingsUi,
});

presentationAutoPlayButton?.addEventListener("click", () => {
  togglePresentationAutoPlay();

  showPresentationControls({
    autoHide: false,
  });
});

// Scale
document.getElementById("multiSlideRotationResetButton")?.addEventListener("click", async () => {
  await resetInspectorSlidesRotation();
});

multiSlideScaleResetButton?.addEventListener("click", async () => {
  await resetInspectorSlidesScale();
});

multiScaleLinkButton?.addEventListener("click", () => {
  slideScaleLinked = !slideScaleLinked;

  refreshSlideScaleLinkButton();
});

multiApplyScaleXDeltaButton?.addEventListener("click", async () => {
  await offsetInspectorSlidesScaleAxis(
    "x",
    Number(multiScaleXDeltaInput.value),
  );
});

multiApplyScaleYDeltaButton?.addEventListener("click", async () => {
  await offsetInspectorSlidesScaleAxis(
    "y",
    Number(multiScaleYDeltaInput.value),
  );
});
multiApplyScaleZDeltaButton?.addEventListener("click", async () => {
  await offsetInspectorSlidesScaleAxis(
    "z",
    Number(multiScaleZDeltaInput.value),
  );
});

// Scene-3Z: Project BGM editor and migration actions retired.
presentationBgmRetryButton?.addEventListener("click", () => {
  const runtime = presentationBgmRuntime;
  if (runtime?.state === "blocked") void playPreparedPresentationBgm(runtime);
});

// Keep Space/Enter on this button from triggering Presentation navigation.
presentationBgmRetryButton?.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") event.stopPropagation();
});

slideBgmUseOverride?.addEventListener("change", async () => {
  if (slideBgmUseOverride.checked) {
    await enableBgmOverrideForInspectorTargets();
  } else {
    await clearBgmOverrideFromInspectorTargets();
  }
});

// Step 12K-1C: Slide BGM editor uses direct control commits.
// Keep the existing batch history logic in applyBgmOverrideToInspectorTargets().
for (const control of [slideBgmEnabled, slideBgmSoundSelect, slideBgmLoop]) {
  control?.addEventListener("change", () => {
    void applyBgmOverrideToInspectorTargets();
  });
}

bindNumericCommitInput(slideBgmVolume, {
  commit: () => {
    // Reject incomplete/out-of-range input before touching other fields.
    const volume = slideBgmVolume.valueAsNumber;
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) return false;
    return applyBgmOverrideToInspectorTargets();
  },
  restore: () => refreshSlideBgmOverrideControls(),
});

// Step 12K-2F: volume slider changes the model during preview but records
// exactly one multi-slide history batch after the gesture finishes.
let slideBgmSliderOriginals = [];
bindSliderCommitInput(slideBgmVolumeSlider, {
  read: () => {
    slideBgmVolumeSlider.dataset.gestureStart = slideBgmVolumeSlider.value;
    slideBgmSliderOriginals = getSlideInspectorTargetEntries()
      .map(({ slideState }) => ({
        slideId: slideState.id,
        target: getSlideOverrideObject(slideState, "bgm"),
      }))
      .filter(({ target }) => target && Object.prototype.hasOwnProperty.call(target, "volume"))
      .map(({ slideId, target }) => ({ slideId, before: structuredClone(target.volume) }));
    return Number(slideBgmVolumeSlider.value);
  },
  preview: (value) => {
    if (!Number.isFinite(value) || value < 0 || value > 1) return;
    // A return to the starting value (including Escape) also restores distinct
    // pre-gesture values when several selected slides have different volumes.
    const starting = slideBgmSliderOriginals;
    const startValue = starting.length
      ? Number(slideBgmVolumeSlider.dataset.gestureStart)
      : NaN;
    if (Number.isFinite(startValue) && Object.is(value, startValue)) {
      for (const { slideId, before } of starting) {
        const state = getSlideInspectorTargetEntries().find(({ slideState }) => slideState.id === slideId)?.slideState;
        const target = state && getSlideOverrideObject(state, "bgm");
        if (target) target.volume = structuredClone(before);
      }
    } else {
      const ids = new Set(starting.map(({ slideId }) => slideId));
      for (const { slideState } of getSlideInspectorTargetEntries()) {
        if (ids.has(slideState.id)) {
          const target = getSlideOverrideObject(slideState, "bgm");
          if (target) target.volume = value;
        }
      }
    }
    slideBgmVolume.value = String(value);
  },
  commit: (before, after) => {
    const changes = slideBgmSliderOriginals
      .filter(({ before: old }) => !Object.is(old, after))
      .map(({ slideId, before: old }) => ({
        slideId, group: "bgm", propertyName: "volume", before: old, after,
      }));
    slideBgmSliderOriginals = [];
    delete slideBgmVolumeSlider.dataset.gestureStart;
    if (changes.length) pushEditorHistory({ type: "slide-multi-property-batch", changes });
    refreshSlideSettingsInspector();
  },
});
// Scene-3Z: slide timing overrides use per-field commits so other BGM values are preserved.
const commitSlideBgmTiming = (key, value) => {
  const changes = [];
  for (const { slideState } of getSlideInspectorTargetEntries()) {
    if (!hasSlideBgmOverride(slideState)) continue;
    const target = getSlideOverrideObject(slideState, "bgm");
    const before = target[key];
    if (Object.is(before, value)) continue;
    target[key] = value;
    changes.push({ slideId: slideState.id, group: "bgm", propertyName: key,
      before, after: value });
  }
  if (changes.length) pushEditorHistory({ type: "slide-multi-property-batch", changes });
  refreshSlideSettingsInspector();
};
for (const [control, key] of [[slideBgmFadeIn, "fadeInSeconds"], [slideBgmFadeOut, "fadeOutSeconds"]]) {
  control?.addEventListener("change", () => {
    const value = control.valueAsNumber;
    if (!Number.isFinite(value) || value < 0 || value > 10) {
      refreshSlideBgmOverrideControls(); return;
    }
    commitSlideBgmTiming(key, value);
  });
}
slideBgmContinueSame?.addEventListener("change", () => commitSlideBgmTiming("continueSameTrack", slideBgmContinueSame.checked));

slideBgmClearButton?.addEventListener("click", async () => {
  await clearBgmOverrideFromInspectorTargets();
});

scenePresetBgmUseOverride?.addEventListener("change", () => {
  if (scenePresetBgmUseOverride.checked) {
    enableScenePresetBgmOverride();
  } else {
    clearScenePresetBgmOverride();
  }
});

// Step 12K-1D: Scene preset BGM commits the edited field only.
for (const [control, field] of [
  [scenePresetBgmEnabled, "enabled"],
  [scenePresetBgmSound, "soundId"],
  [scenePresetBgmLoop, "loop"],
]) {
  control?.addEventListener("change", () => {
    if (!commitScenePresetBgmField(field)) refreshScenePresetBgmControls();
  });
}
bindNumericCommitInput(scenePresetBgmVolume, {
  commit: () => commitScenePresetBgmField("volume"),
  restore: () => refreshScenePresetBgmControls(),
});

// Step 12K-4: Scene Preset BGM commits to the shared settings history.
let scenePresetBgmVolumeSliderSettingsEdit = null;
bindSliderCommitInput(scenePresetBgmVolumeSlider, {
  read: () => { scenePresetBgmVolumeSliderSettingsEdit = beginSettingsEdit(); return resolveScenePresetBgm(currentProjectData, getCurrentScenePresetForEditor()).volume; },
  preview: (value) => {
    const preset = getCurrentScenePresetForEditor();
    if (!preset || !Number.isFinite(value)) return;
    preset.bgm = normalizeScenePresetBgm({ ...normalizeScenePresetBgm(preset.bgm), volume: value });
    scenePresetBgmVolume.value = String(value);
  },
  cancel: () => {
    if (scenePresetBgmVolumeSliderSettingsEdit?.project === currentProjectData) {
      const changes = diffSettings(scenePresetBgmVolumeSliderSettingsEdit.before, captureSettings(currentProjectData, slideStates, presentationSettings));
      applySettingsPatch({project: currentProjectData, presentation: presentationSettings, slides: Object.fromEntries(slideStates.map(slide => [slide.id, slide]))}, changes, "before");
    }
    scenePresetBgmVolumeSliderSettingsEdit = null;
    refreshProjectBgmUi(); refreshScenePresetBgmControls();
  },
  commit: (_before, after) => {
    finishSettingsEdit(scenePresetBgmVolumeSliderSettingsEdit);
    scenePresetBgmVolumeSliderSettingsEdit = null;
    scenePresetBgmVolume.value = String(after);
    refreshScenePresetBgmControls();
  },
});

scenePresetBgmClearButton?.addEventListener("click", () => {
  clearScenePresetBgmOverride();
});

slideAutoPlayUseOverride?.addEventListener("change", () => {
  if (slideAutoPlayUseOverride.checked) {
    enableAutoPlayOverrideForInspectorTargets();
  } else {
    clearAutoPlayOverrideFromInspectorTargets();
  }
});

// Step 12K-1B: Shared Enter/blur/Escape lifecycle; the existing editor
// mutation function remains responsible for validation and Undo/Redo.
bindNumericCommitInput(slideAutoPlayInterval, {
  commit: () => applyAutoPlayOverrideToInspectorTargets(),
  restore: () => refreshSlideAutoPlayControls(),
});

slideAutoPlayClearButton?.addEventListener("click", () => {
  clearAutoPlayOverrideFromInspectorTargets();
});

appNoticeCloseButton?.addEventListener("click", hideAppNotice);

// コピペ
copySlideButton.addEventListener("click", () => executeSlideCommand("copy"));

pasteSlideButton.addEventListener("click", () => executeSlideCommand("paste-after"));

// DOMからコマンド名を受け取る処理は専用モジュールに委譲する。
// Shared command execution for the context menu and slide toolbar.
// UI-specific closing stays here; command actions live in one dispatch table.
const executeSlideCommand = createSlideCommandExecutor({
  copy: () => copySlides(),
  "paste-after": () => pasteCopiedSlides(),
  duplicate: () => duplicateSlides(),
  "move-left": () => moveSlides("left"),
  "move-right": () => moveSlides("right"),
  "gather-selected": () => gatherSelectedSlides(),
  "move-selected-to-start": () => moveSelectedSlidesToStart(),
  "move-selected-to-end": () => moveSelectedSlidesToEnd(),
  "place-camera": () => placeCurrentSlideInFrontOfCameraWithHistory(),
  delete: () => deleteSlides(),
});

slideContextMenuController.bindCommands({
  onCommand: async (command, contextIndex) => {
    // Close immediately, including when the command runs asynchronously.
    closeSlideContextMenu();
    if (command === "set-current") {
      await selectSlideByIndex(contextIndex, {moveCamera:false, preserveSelection:true});
    } else {
      await executeSlideCommand(command);
    }
  },
});

window.addEventListener("resize", function () {
  closeSlideContextMenu();
  engine.resize();
  resizeCanvas();
  normalizeEditorPanelWidths();
});

window.addEventListener("load", function () {
  engine.resize();
  resizeCanvas();
});

// 1秒ごとに表示を更新
setInterval(displayCurrentTime, 1000);

// ページ読み込み時に一度だけ実行
displayCurrentTime();

// お絵描きとネオンラインのアニメーションの初期化
toggleActiveLayer();

drawingController.startNeonAnimation();

// マウス情報
webglCanvas.addEventListener(
  "mousemove",
  function (evt) {
    const mousePos = getPointerPos(webglCanvas, evt);
    webglCanvasX.innerHTML = Math.round(mousePos.x);
    webglCanvasY.innerHTML = Math.round(mousePos.y);
  },
  false,
);








openProjectButton.addEventListener("click", async () => {
  if (projectOperationBusy) {
    return;
  }

  if (!("showDirectoryPicker" in window)) {
    alert(t("このブラウザはフォルダ選択に対応していません。"));
    return;
  }

  projectOperationBusy = true;
  openProjectButton.disabled = true;
  newProjectButton.disabled = true;

  try {
    const directoryHandle = await window.showDirectoryPicker({
      mode: "readwrite",
    });

    await openProjectFromDirectory(directoryHandle);
  } catch (error) {
    if (error.name === "AbortError") {
      projectStatus.notice("キャンセル");
      return;
    }

    console.error("Project open failed:", error);
    projectStatus.notice("読み込み失敗");
  } finally {
    projectOperationBusy = false;
    openProjectButton.disabled = false;
    newProjectButton.disabled = false;
  }
});

const newProjectNameDialog = document.getElementById("newProjectNameDialog");
const newProjectNameForm = document.getElementById("newProjectNameForm");
const newProjectNameInput = document.getElementById("newProjectNameInput");
const newProjectNameError = document.getElementById("newProjectNameError");
const newProjectNameCancel = document.getElementById("newProjectNameCancel");

// Resolve with a name only after the user explicitly confirms the modal.
// Escape, Cancel, or closing the dialog leaves the current project untouched.
function requestNewProjectName() {
  return new Promise(resolve => {
    newProjectNameInput.value = t("新しいプロジェクト");
    newProjectNameError.textContent = "";
    newProjectNameInput.removeAttribute("aria-invalid");
    const finish = name => {
      newProjectNameForm.removeEventListener("submit", onSubmit);
      newProjectNameCancel.removeEventListener("click", onCancel);
      newProjectNameDialog.removeEventListener("close", onClose);
      if (newProjectNameDialog.open) newProjectNameDialog.close();
      resolve(name);
    };
    const onSubmit = event => {
      event.preventDefault();
      const name = validateNewProjectName(newProjectNameInput.value);
      if (!name) {
        newProjectNameError.textContent = t("プロジェクト名が無効です。使用できない文字が含まれていないか確認してください。");
        newProjectNameInput.setAttribute("aria-invalid", "true");
        newProjectNameInput.focus();
        return;
      }
      finish(name);
    };
    const onCancel = () => finish(null);
    const onClose = () => finish(null);
    newProjectNameForm.addEventListener("submit", onSubmit);
    newProjectNameCancel.addEventListener("click", onCancel);
    newProjectNameDialog.addEventListener("close", onClose);
    newProjectNameDialog.showModal();
    newProjectNameInput.focus();
    newProjectNameInput.select();
  });
}

newProjectButton.addEventListener("click", async () => {
  if (projectOperationBusy) return;
  if (!("showDirectoryPicker" in window)) {
    showAppNotice(t("このブラウザはフォルダ選択に対応していません。"), { level: "error" });
    return;
  }
  const name = await requestNewProjectName();
  if (name === null) return;
  projectOperationBusy = true;
  openProjectButton.disabled = true;
  newProjectButton.disabled = true;
  try {
    const parentDirectory = await window.showDirectoryPicker({ mode: "readwrite" });
    const projectDirectory = await createProjectDirectory(parentDirectory, name, createFreshProjectData());
    // Use the same setup as opening a saved project, so audio and asset libraries
    // immediately receive a valid directory handle without a separate Save step.
    await openProjectFromDirectory(projectDirectory);
    projectStatus.notice(t("プロジェクトフォルダを作成しました"));
  } catch (error) {
    if (error?.name === "AbortError") {
      projectStatus.notice(t("キャンセル"));
    } else {
      console.error("New project folder creation failed:", error);
      const message = error?.message === "PROJECT_DIRECTORY_EXISTS"
        ? t("同名のフォルダがすでにあります。別のプロジェクト名を指定してください。")
        : error?.message === "INVALID_PROJECT_NAME"
          ? t("プロジェクト名が無効です。使用できない文字が含まれていないか確認してください。")
          : t("プロジェクトを作成できませんでした。フォルダの書き込み権限を確認してください。");
      showAppNotice(message, { level: "error" });
      projectStatus.notice(message);
    }
  } finally {
    projectOperationBusy = false;
    openProjectButton.disabled = false;
    newProjectButton.disabled = false;
  }
});

const slideRotationSpaceHint = document.getElementById("slideRotationSpaceHint");
const refreshSlideRotationSpaceHint = () => {
  if (slideRotationSpaceHint) {
    const modeName = slideGizmoCoordinateMode === "local" ? "Local" : "World";
    slideRotationSpaceHint.textContent = `Pitch/Yaw/Roll display Euler values. Editing a target rotates by its difference from the displayed value along the ${modeName} Gizmo axis; compound rotations may display a different Euler angle afterward. Δ uses ${modeName} axes.`;
  }
};
refreshSlideRotationSpaceHint();

// Coordinate-mode changes do not alter a slide quaternion or create undo history.
// Refresh *after* Gizmo mode is applied, including a focused rotation slider.
const setSlideRotationCoordinateModeFromUi = (mode) => {
  if (slideGizmoCoordinateMode === mode) {
    refreshSlideRotationSpaceHint();
    refreshSharedTransformControls({ forceRotationSliders: true });
    refreshSlideGizmoUi();
    return;
  }
  slideGizmoCoordinateMode = mode;
  applySlideGizmoCoordinateMode();
  refreshSlideRotationSpaceHint();
  refreshSharedTransformControls({ forceRotationSliders: true });
  refreshSlideGizmoUi();
};

// Panel
editorLayout.bindEvents();

// bindNumberInputEnter

// Step 12K-1E: individual Environment / Transition numeric overrides.
// Validate synchronously so incomplete input never reaches async mutation.
// Each successful commit uses the existing batch-history mutation functions.
// Step 12K-2G: Fog Density uses a single undoable transaction per slider gesture.
let fogSliderOriginals = [];
let fogSliderScene = null;
let fogSliderSceneOriginal = null;
let fogSliderStart = 0.002;
bindSliderCommitInput(multiFogDensitySlider, {
  read: () => {
    fogSliderStart = Number(multiFogDensitySlider.value);
    fogSliderOriginals = getSlideInspectorTargetEntries().map(({ slideState }) => ({
      slideId: slideState.id,
      before: structuredClone(slideState.environmentOverride?.fogDensity),
    }));
    fogSliderScene = scene;
    fogSliderSceneOriginal = scene?.fogDensity ?? null;
    return fogSliderStart;
  },
  preview: (value) => {
    if (!Number.isFinite(value) || value < 0 || value > 0.05) return;
    const restored = Object.is(value, fogSliderStart);
    const selected = new Map(fogSliderOriginals.map(entry => [entry.slideId, entry.before]));
    for (const { slideState } of getSlideInspectorTargetEntries()) {
      if (!selected.has(slideState.id)) continue;
      const before = selected.get(slideState.id);
      if (restored && before === undefined) {
        if (slideState.environmentOverride) delete slideState.environmentOverride.fogDensity;
      } else {
        slideState.environmentOverride ??= {};
        slideState.environmentOverride.fogDensity = restored ? structuredClone(before) : value;
      }
    }
    if (fogSliderScene && scene === fogSliderScene) {
      fogSliderScene.fogDensity = restored ? fogSliderSceneOriginal : value;
    }
    // Do not overwrite the number while the slider remains focused.
    multiFogDensityInput.value = restored ? "" : String(value);
  },
  commit: (_start, after) => {
    const changes = fogSliderOriginals
      .filter(({ before }) => !areEditorValuesEqual(before, after))
      .map(({ slideId, before }) => ({ slideId, before, after }));
    fogSliderOriginals = [];
    fogSliderScene = null;
    fogSliderSceneOriginal = null;
    if (changes.length) pushEditorHistory({
      type: "slide-environment-override-batch", propertyName: "fogDensity", changes,
    });
    clearMultiInspectorFieldDirty("environment:fogDensity");
    void refreshAfterEnvironmentOverrideBatch(changes);
  },
});

// Step 12K-2L: three Procedural Sky fields share the same slide-environment
// history transaction. Preview touches the current sky material directly,
// avoiding asynchronous environment reloads on every slider input event.
for (const [property, slider] of Object.entries(environmentSkySliders)) {
  const numericInput = property === "turbidity" ? multiTurbidityInput
    : property === "inclination" ? multiInclinationInput : multiAzimuthInput;
  let originals = [];
  let startingValue = 0;
  let previewScene = null;
  let previewController = null;
  let originalMaterialValue = null;
  bindSliderCommitInput(slider, {
    read: () => {
      startingValue = Number(slider.value);
      originals = getSlideInspectorTargetEntries().map(({ slideState }) => ({
        slideId: slideState.id,
        before: structuredClone(slideState.environmentOverride?.[property]),
      }));
      previewScene = scene;
      previewController = activeEnvironmentController;
      originalMaterialValue = Number(previewController?.proceduralSkyMaterial?.[property]);
      return startingValue;
    },
    preview: (value) => {
      if (!Number.isFinite(value) || value < Number(slider.min) || value > Number(slider.max)) return;
      const restored = Object.is(value, startingValue);
      const previous = new Map(originals.map(item => [item.slideId, item.before]));
      for (const { slideState } of getSlideInspectorTargetEntries()) {
        if (!previous.has(slideState.id)) continue;
        const before = previous.get(slideState.id);
        if (restored && before === undefined) {
          if (slideState.environmentOverride) delete slideState.environmentOverride[property];
        } else {
          slideState.environmentOverride ??= {};
          slideState.environmentOverride[property] = restored ? structuredClone(before) : value;
        }
      }
      if (scene === previewScene && activeEnvironmentController === previewController &&
          previewController?.proceduralSkyMaterial) {
        const materialValue = restored ? originalMaterialValue : value;
        if (Number.isFinite(materialValue)) previewController.proceduralSkyMaterial[property] = materialValue;
      }
      numericInput.value = restored ? "" : String(value);
    },
    commit: (_start, after) => {
      const changes = originals
        .filter(({ before }) => !areEditorValuesEqual(before, after))
        .map(({ slideId, before }) => ({ slideId, before, after }));
      originals = [];
      previewScene = null;
      previewController = null;
      originalMaterialValue = null;
      if (changes.length) pushEditorHistory({
        type: "slide-environment-override-batch", propertyName: property, changes,
      });
      clearMultiInspectorFieldDirty(`environment:${property}`);
      void refreshAfterEnvironmentOverrideBatch(changes);
    },
  });
}

for (const [input, property, min, max] of [
  [multiFogDensityInput, "fogDensity", 0, 0.05],
  [multiTurbidityInput, "turbidity", 0, 100],
  [multiInclinationInput, "inclination", 0, 1],
  [multiAzimuthInput, "azimuth", 0, 1],
]) {
  bindNumericCommitInput(input, {
    commit: () => {
      const raw = input.value.trim();
      const value = Number(raw);
      if (!raw || !Number.isFinite(value) || value < min || value > max) return false;
      void applyNumericEnvironmentOverrideFromInput(input, property, { min, max });
      return true;
    },
    restore: () => {
      clearMultiInspectorFieldDirty(`environment:${property}`);
      refreshMultiEnvironmentOverrideControls();
    },
  });
}
slideCustomTransitionTimingMode?.addEventListener('change',()=>{
  void applyTransitionOverrideToInspectorTargets('mode',slideCustomTransitionTimingMode.value);
});
for (const [property,input] of Object.entries(transitionDurationInputs)) {
  bindNumericCommitInput(input, {
    commit: () => {
      const value=Number(input.value);
      if (!input.value.trim() || !Number.isFinite(value) || value<0 || value>120) return false;
      void applyTransitionOverrideToInspectorTargets(property,value);
      return true;
    },
    restore: () => refreshMultiTransitionOverrideControls(),
  });
}
// Step 12K-2I: Transition Speed sliders share the existing batch history format.
// The preview updates only the selected slide data and numeric display;
// the expensive inspector refresh and history insertion happen once on commit.
for (const [property, slider] of Object.entries(transitionSpeedSliders)) {
  const numericInput = property === "previousSpeed" ? multiPreviousSpeedInput
    : property === "currentSpeed" ? multiCurrentSpeedInput : multiNextSpeedInput;
  let originals = [];
  let startingValue = 1;
  bindSliderCommitInput(slider, {
    read: () => {
      startingValue = Number(slider.value);
      originals = getSlideInspectorTargetEntries().map(({ slideState }) => ({
        slideId: slideState.id,
        before: structuredClone(slideState.transitionOverride?.[property]),
      }));
      return startingValue;
    },
    preview: (value) => {
      if (!Number.isFinite(value) || value < 0) return;
      const restored = Object.is(value, startingValue);
      const previous = new Map(originals.map(item => [item.slideId, item.before]));
      for (const { slideState } of getSlideInspectorTargetEntries()) {
        if (!previous.has(slideState.id)) continue;
        const before = previous.get(slideState.id);
        if (restored && before === undefined) {
          if (slideState.transitionOverride) delete slideState.transitionOverride[property];
        } else {
          slideState.transitionOverride ??= {};
          slideState.transitionOverride[property] = restored ? structuredClone(before) : value;
        }
      }
      numericInput.value = restored ? "" : String(value);
    },
    commit: (_before, after) => {
      const changes = originals
        .filter(({ before }) => !areEditorValuesEqual(before, after))
        .map(({ slideId, before }) => ({ slideId, before, after }));
      originals = [];
      if (changes.length) pushEditorHistory({
        type: "slide-transition-override-batch", propertyName: property, changes,
      });
      clearMultiInspectorFieldDirty(`transition:${property}`);
      void refreshAfterTransitionOverrideBatch(changes);
    },
  });
}

for (const [input, property] of [
  [multiPreviousSpeedInput, "previousSpeed"],
  [multiCurrentSpeedInput, "currentSpeed"],
  [multiNextSpeedInput, "nextSpeed"],
]) {
  bindNumericCommitInput(input, {
    commit: () => {
      const raw = input.value.trim();
      const value = Number(raw);
      if (!raw || !Number.isFinite(value) || value < 0) return false;
      void applyNumericTransitionOverrideFromInput(input, property, { min: 0 });
      return true;
    },
    restore: () => {
      clearMultiInspectorFieldDirty(`transition:${property}`);
      refreshMultiTransitionOverrideControls();
    },
  });
}

// Step 12K-2B: absolute position / rotation commits without Set buttons.
// Delta actions intentionally remain explicit button operations.
for (const [input, axis] of [
  [multiPositionXInput, "x"],
  [multiPositionYInput, "y"],
  [multiPositionZInput, "z"],
]) {
  bindNumericCommitInput(input, {
    commit: () => {
      const raw = input.value.trim();
      const value = Number(raw);
      if (!raw || !Number.isFinite(value)) return false;
      // The operation owns Undo/Redo and refreshing the inspector.
      void setSelectedSlidesPositionAxis(axis, value);
      return true;
    },
    restore: () => refreshMultiPositionInput(input, axis),
  });
}
for (const [input, axis] of [
  [multiRotationPitchInput, "pitch"],
  [multiRotationYawInput, "yaw"],
  [multiRotationRollInput, "roll"],
]) {
  bindNumericCommitInput(input, {
    commit: () => {
      const raw = input.value.trim();
      const value = Number(raw);
      if (!raw || !Number.isFinite(value)) return false;
      void setSelectedSlidesRotationAxis(axis, value);
      return true;
    },
    restore: () => refreshMultiRotationInput(input, axis),
  });
}

// Step 12K-2H: preview rotation without generating history on every input event.
// Store a separate starting transform for each selected slide (including Mixed).
for (const axis of ["pitch", "yaw", "roll"]) {
  const slider = multiRotationSliders[axis];
  const numericInput = {
    pitch: multiRotationPitchInput,
    yaw: multiRotationYawInput,
    roll: multiRotationRollInput,
  }[axis];
  let originals = [];
  let startDegrees = 0;
  bindSliderCommitInput(slider, {
    read: () => {
      const common = getInspectorTargetRotationCommonValue(axis);
      startDegrees = common.state === "same" ? common.value : 0;
      originals = getSlideInspectorTargetEntries().map(({ slideState }) => ({
        slideId: slideState.id,
        before: createSlideTransformHistorySnapshot(slideState),
        degrees: getSlideRotationEulerDegrees(slideState)[axis],
      }));
      return startDegrees;
    },
    preview: value => {
      if (!Number.isFinite(value) || value < -180 || value > 180) return;
      const restoring = Math.abs(value - startDegrees) < 1e-8;
      for (const original of originals) {
        const slideState = findSlideStateById(original.slideId);
        if (!slideState) continue;
        const before = original.before;
        // Restore baseline before applying each preview to avoid accumulated drift.
        slideState.position = before.position.clone();
        slideState.rotationQuaternion = before.rotationQuaternion.clone();
        slideState.cameraPosition = before.cameraPosition.clone();
        slideState.cameraRotation = before.cameraRotation.clone();
        if (!restoring) {
          // Always apply against the captured baseline, not the last preview.
          // The current gizmo mode controls the rotation axis.
          applyGizmoAxisTarget(slideState, axis, value, original.degrees);
          syncCameraPoseAfterSlideTransform(slideState, before);
        }
        applySlideTransformStateToMesh(slideState);
      }
      numericInput.value = restoring && originals.some(o => Math.abs(o.degrees - originals[0].degrees) > .001)
        ? "" : String(restoring ? startDegrees : value);
      refreshCurrentSlideGizmoAfterTransform();
    },
    commit: (_before, _after) => {
      const changes = originals.flatMap(({ slideId, before }) => {
        const slideState = findSlideStateById(slideId);
        if (!slideState) return [];
        const after = createSlideTransformHistorySnapshot(slideState);
        return slideTransformHistoryStatesEqual(before, after) ? [] : [{ slideId, before, after }];
      });
      originals = [];
      if (changes.length) pushEditorHistory({ type: "slide-transform-batch", changes });
      void refreshAfterSlideTransformBatch(changes, "after");
    },
  });
}

// Step 12K-2M: one history entry per scale/camera slider gesture.
for (const [axis, slider] of Object.entries(slideScaleSliders)) {
  let originals = [];
  let initial = 1;
  const input = ({x:multiScaleXInput,y:multiScaleYInput,z:multiScaleZInput})[axis];
  bindSliderCommitInput(slider, {
    read: () => {
      initial = Number(slider.value);
      originals = getSlideInspectorTargetEntries().map(({ slideState }) => ({
        slideId: slideState.id, before: createSlideTransformHistorySnapshot(slideState),
      }));
      return initial;
    },
    preview: value => {
      if (!Number.isFinite(value) || value <= 0) return;
      const groupMode = scalePivotMode('slide') === 'group' && originals.length > 1;
      const pivotEntry = originals.find(entry=>entry.slideId === getCurrentSlideState()?.id);
      const pivot = pivotEntry?.before?.position ?? null;
      const reference = pivotEntry ? normalizeSlideScale(pivotEntry.before.slideScale)[axis] : initial;
      const ratio = reference > 0 ? value / reference : 1;
      for (const { slideId, before } of originals) {
        const slideState = findSlideStateById(slideId);
        if (!slideState) continue;
        const base = normalizeSlideScale(before.slideScale);
        if (Math.abs(value - initial) < 1e-9) {
          slideState.slideScale = base;
          if (groupMode) {
            slideState.position = before.position.clone();
            slideState.cameraPosition = before.cameraPosition.clone();
          }
          applySlideTransformStateToMesh(slideState);
          continue;
        }
        const old = base[axis];
        if (groupMode) {
          for (const other of (slideScaleLinked ? ["x","y","z"] : [axis])) base[other] *= ratio;
        } else if (slideScaleLinked && old > 0) {
          for (const other of ["x", "y", "z"]) {
            if (other !== axis) base[other] *= value / old;
          }
        }
        if (!groupMode) base[axis] = value;
        if (groupMode && pivot) scene2iScaleSlideAroundPivot(slideState, before, pivot, {x:slideScaleLinked?ratio:axis==="x"?ratio:1, y:slideScaleLinked?ratio:axis==="y"?ratio:1, z:slideScaleLinked?ratio:axis==="z"?ratio:1});
        slideState.slideScale = base;
        applySlideTransformStateToMesh(slideState);
      }
      input.value = String(value);
    },
    commit: () => {
      const changes = originals.flatMap(({ slideId, before }) => {
        const slideState = findSlideStateById(slideId);
        if (!slideState) return [];
        const after = createSlideTransformHistorySnapshot(slideState);
        return slideTransformHistoryStatesEqual(before, after) ? [] : [{ slideId, before, after }];
      });
      originals = [];
      if (changes.length) pushEditorHistory({ type: "slide-transform-batch", changes });
      void refreshAfterSlideTransformBatch(changes, "after");
    },
  });
}
{
  let originals = [];
  let initial = 1;
  // The follow flag belongs to one camera slider gesture. Without a declaration
  // read() throws in this ES module before preview() can move the camera.
  let followCurrent = false;
  const input = multiCameraDistanceInput;
  bindSliderCommitInput(cameraDistanceSlider, {
    read: () => {
      originals = scene3pCameraTargetEntries().map(({ slideState }) => ({
        slideId: slideState.id, before: createSlideCameraHistorySnapshot(slideState),
        distance: getSlideCameraDistance(slideState),
      }));
      initial = Number(cameraDistanceSlider.value);
      followCurrent = false;
      const current = getCurrentSlideState();
      const record = originals.find(item => item.slideId === current?.id);
      followCurrent = Boolean(record && scene3pShouldFollowCamera(record.before.cameraPosition, current));
      return initial;
    },
    preview: value => {
      if (!Number.isFinite(value) || value <= 0) return;
      for (const { slideId, before } of originals) {
        const slideState = findSlideStateById(slideId);
        if (!slideState) continue;
        // Rebuild from the original transform, not the previous preview.
        slideState.cameraPosition = before.cameraPosition.clone();
        slideState.cameraRotation = before.cameraRotation.clone();
        if (Math.abs(value - initial) > 1e-9) rebuildSlideCameraPoseWithDistance(slideState, value);
      }
      input.value = String(value);
      if (followCurrent) {
        const current = getCurrentSlideState();
        const entry = originals.find(item=>item.slideId===current?.id);
        if (entry && current) applyCameraPoseToViewport(current.cameraPosition, current.cameraRotation);
      }
    },
    commit: () => {
      const changes = originals.flatMap(({ slideId, before }) => {
        const slideState = findSlideStateById(slideId);
        if (!slideState) return [];
        const after = createSlideCameraHistorySnapshot(slideState);
        return Vector3.Distance(before.cameraPosition, after.cameraPosition) < 1e-7 ? [] : [{ slideId, before, after }];
      });
      originals = [];
      followCurrent = false;
      if (changes.length) pushEditorHistory({ type: "slide-camera-batch", changes });
      void refreshAfterSlideCameraBatch(changes, "after");
    },
  });
}
// Asset scale sliders respect linked-axis proportional scaling.
for (const [axis, slider] of Object.entries(assetScaleSliders)) {
  let original = null;
  let gestureAsset = null;
  let groupEdit = null;
  const index = { x: 0, y: 1, z: 2 }[axis];
  const numberInput = { x: assetScaleX, y: assetScaleY, z: assetScaleZ }[axis];
  bindSliderCommitInput(slider, {
    read: () => {
      gestureAsset = getSelectedSceneAssetConfig();
      original = gestureAsset ? cloneAssetTransform(ensureAssetTransform(gestureAsset)) : null;
      groupEdit = scene2iBeginNumericAssetScale();
      slider.dataset.gestureStart = slider.value;
      return Number(slider.value);
    },
    preview: value => {
      if (!original || !gestureAsset || gestureAsset !== getSelectedSceneAssetConfig() || !Number.isFinite(value) || value <= 0) return;
      const transform = ensureAssetTransform(gestureAsset);
      const scales = [...original.scale];
      if (Math.abs(value - Number(slider.dataset.gestureStart ?? value)) < 1e-9) {
        transform.scale = scales;
        applySelectedAssetTransform();
        if (groupEdit) scene2cUpdateGroup(groupEdit);
        numberInput.value = String(value);
        return;
      }
      if (assetUniformScaleEnabled && scales[index] > 0) {
        const factor = value / scales[index];
        for (let i = 0; i < 3; i++) scales[i] *= factor;
      } else scales[index] = value;
      transform.scale = scales;
      applySelectedAssetTransform();
      if (groupEdit) scene2cUpdateGroup(groupEdit);
      numberInput.value = String(value);
      if (assetUniformScaleEnabled) assetUniformScaleInput.value = String(value);
    },
    commit: () => {
      if (groupEdit) { scene2cUpdateGroup(groupEdit); scene2cCommitGroup(groupEdit); }
      else if (gestureAsset && original) recordAssetTransformHistory(gestureAsset, original, cloneAssetTransform(ensureAssetTransform(gestureAsset)));
      groupEdit = null;
      gestureAsset = null; original = null;
      refreshSelectedAssetTransformInputs();
      refreshAssetUniformScaleUi();
    },
  });
}

slideTransformPivotSelect?.addEventListener('change', () => refreshSharedTransformControls());
// Step 12K-2C: Scale and Camera Distance use the same commit/cancel rules.
for (const [input, axis] of [
  [multiScaleXInput, "x"],
  [multiScaleYInput, "y"],
  [multiScaleZInput, "z"],
]) {
  bindNumericCommitInput(input, {
    commit: () => {
      const raw = input.value.trim();
      const value = Number(raw);
      if (!raw || !Number.isFinite(value) || value <= 0) return false;
      void setInspectorSlidesScaleAxis(axis, value);
      return true;
    },
    restore: () => refreshSharedScaleInput(input, axis),
  });
}
bindNumericCommitInput(multiCameraDistanceInput, {
  commit: () => {
    const raw = multiCameraDistanceInput.value.trim();
    const value = Number(raw);
    if (!raw || !Number.isFinite(value) || value <= 0) return false;
    void setSelectedSlidesCameraDistance(value);
    return true;
  },
  restore: () => refreshMultiCameraControls(),
});

// bindEnterToButton







bindEnterToButton(multiPositionXDeltaInput, multiApplyPositionXDeltaButton);

bindEnterToButton(multiPositionYDeltaInput, multiApplyPositionYDeltaButton);

bindEnterToButton(multiPositionZDeltaInput, multiApplyPositionZDeltaButton);

bindEnterToButton(
  multiRotationPitchDeltaInput,
  multiApplyRotationPitchDeltaButton,
);

bindEnterToButton(multiRotationYawDeltaInput, multiApplyRotationYawDeltaButton);

bindEnterToButton(
  multiRotationRollDeltaInput,
  multiApplyRotationRollDeltaButton,
);





bindEnterToButton(multiScaleXDeltaInput, multiApplyScaleXDeltaButton);

bindEnterToButton(multiScaleYDeltaInput, multiApplyScaleYDeltaButton);
bindEnterToButton(multiScaleZDeltaInput, multiApplyScaleZDeltaButton);



bindEnterToButton(
  multiCameraDistanceDeltaInput,
  multiApplyCameraDistanceDeltaButton,
);

// Scene-3W hotfix: startup may request a shared Transform sync before the editor controls are wired.
// Shared Transform sync lifecycle is independent of either legacy inspector.
// Keep these declarations above application startup (TDZ-safe).
let scene3kSyncQueued = false;
let scene3kSyncReady = false;
let scene3xTransformSession = 0;

canvasResizeObserver.observe(canvasContainer);

engine.runRenderLoop(() => {
  if (scene && scene.activeCamera) {
    // Transient helpers, rebuilt only when transforms or options change.
    refreshEditorVisualGuides();
    refreshCanvasSelectionHighlights();
    scene.render();
  }
});

try {
  // Panel
  loadEditorLayoutSettings();

  // Keyboard
  setKeyboardEvents();

  // =====================================
  // 空EditorにもProject Dataを持たせる
  // =====================================

  currentProjectData = createDefaultProjectData();

  applyPresentationSettingsFromProjectData();

  refreshPresentationSettingsUi();

  refreshProjectBgmUi();

  projectName = currentProjectData.name;

  presentationSession = createPresentationSession();

  // 空のEditorとして起動
  const built = await buildEmptyEditorScene(engine);

  activateBuiltScene(built);

  // Default Environmentを反映
  await applyCurrentEnvironment();

  currentProjectName.textContent = projectName;

  refreshInspectorContextUi();
  projectStatus.markNew();
  projectStatus.notice("新規プロジェクト");

  renderTable();

  refreshSceneAssetEditor();

  refreshSlideSettingsInspector();
  refreshEditingScenePresetSelector();
} catch (error) {
  console.error("アプリの初期化に失敗しました:", error);
}

// ==========================================
// X. 未使用の変数・関数 (Unused Items)
// ==========================================

onLanguageChange(() => {
  const context = getSlideInspectorContext();
  refreshInspectorContextUi();
  refreshSlideInspectorTitle(context);
  refreshMultiCurrentSlideInfo(context);
  refreshMultiSelectedSlideList(context);
  slideTransformTargetLabel.textContent = t(getSlideInspectorTargetLabel(context));
  slideSettingsTargetLabel.textContent = t(getSlideInspectorTargetLabel(context));
});

// Audio library manager: registration is explicit; saving is still a separate action.
function initializeAudioLibraryReview() {
  const trigger = document.getElementById('audioLibraryScanButton');
  if (!trigger) return;
  trigger.addEventListener('click', async () => {
    void uiSound.play();
    if (!currentProjectDirectoryHandle || !currentProjectData) {
      window.alert(t('Open a project folder before managing audio.'));
      return;
    }
    const dialog = document.createElement('dialog');
    dialog.className = 'audio-review-dialog library-manager-dialog';
    for(const event of ['keydown','keyup']) dialog.addEventListener(event, e=>e.stopPropagation());
    const mk = (tag, label, className) => {
      const el = document.createElement(tag);
      if (label) el.textContent = t(label);
      if (className) el.className = className;
      return el;
    };
    function audioModal({title, label, value = '', validate = null, message = '', inputEnabled = true}) {
      return new Promise(resolve => {
        const modal=document.createElement('dialog');modal.className='preset-name-dialog audio-edit-dialog library-action-dialog';
        const form=document.createElement('form');form.noValidate=true;
        const heading=mk('h2',title);
        const help=mk('p',message);
        const field=mk('label',label);
        const input=document.createElement('input');input.type='text';input.value=value;input.disabled=!inputEnabled;
        const error=mk('p',null,'form-error');error.setAttribute('role','alert');
        field.append(input);
        const actions=mk('div',null,'dialog-actions library-manager-footer');
        const cancel=mk('button','Cancel');cancel.type='button';
        const apply=mk('button',inputEnabled?'Apply name':'OK','primary-action');apply.type='submit';
        actions.append(cancel,apply);form.append(heading,help,field,error,actions);modal.append(form);
        document.body.append(modal);
        let result=null;
        cancel.addEventListener('click',()=>modal.close());
        for(const event of ['keydown','keyup']) modal.addEventListener(event,e=>e.stopPropagation());
        form.addEventListener('submit',e=>{
          e.preventDefault();
          const next=input.value.trim();
          const issue=inputEnabled?validate?.(next):null;
          if(issue){error.textContent=t(issue);input.focus();return;}
          result=inputEnabled?next:true;modal.close();
        });
        modal.addEventListener('close',()=>{modal.remove();resolve(result);},{once:true});
        modal.showModal();if(inputEnabled){input.focus();input.select();}
        void uiSound.play();
      });
    }
    // Confirmation/notice dialog reuses the preset dialog theme, i18n and UI sound.
    function audioNotice({ title, message, confirm = false }) {
      return new Promise(resolve => {
        const modal = document.createElement('dialog');
        modal.className = 'preset-name-dialog audio-edit-dialog library-action-dialog';
        modal.addEventListener('keydown', event => event.stopPropagation());
        modal.addEventListener('keyup', event => event.stopPropagation());
        const heading = mk('h2', title);
        const description = mk('p', message);
        const actions = mk('div', null, 'dialog-actions library-manager-footer');
        const cancel = mk('button', 'Cancel');
        cancel.type = 'button';
        const accept = mk('button', confirm ? 'Unregister' : 'OK', 'primary-action');
        accept.type = 'button';
        if (confirm) actions.append(cancel);
        actions.append(accept);
        modal.append(heading, description, actions);
        document.body.append(modal);
        let accepted = false;
        cancel.addEventListener('click', () => { void uiSound.play(); modal.close(); });
        accept.addEventListener('click', () => { void uiSound.play(); accepted = true; modal.close(); });
        modal.addEventListener('close', () => { modal.remove(); resolve(accepted); }, { once: true });
        modal.showModal();
        accept.focus();
        void uiSound.play();
      });
    }
    const btn = (label, handler) => {
      const el = mk('button',label);
      el.type='button';
      el.addEventListener('click', () => { void uiSound.play(); handler(); });
      return el;
    };
    dialog.append(mk('h2','Audio Library'));
    dialog.append(mk('p','Review audio files before registering them. Changes are saved with the project.'));
    const filterRow=mk('div',null,'audio-review-actions');
    const filter=mk('select');
    for(const key of ['All','BGM','SFX']) filter.add(new Option(t(key),key.toLowerCase()));
    filterRow.append(mk('label','Show:'),filter);
    dialog.append(filterRow);
    const status=mk('p',null,'audio-review-status'); dialog.append(status);
    const registeredHeading=mk('h3','Registered audio'); dialog.append(registeredHeading);
    const registeredList=mk('div',null,'audio-review-list');dialog.append(registeredList);
    const discoveredHeading=mk('h3','New audio files');dialog.append(discoveredHeading);
    const candidateList=mk('div',null,'audio-review-list');dialog.append(candidateList);
    let previewAudio=null, previewUrl=null, playingButton=null, playingPath=null;
    function stopPreview(){
      if(previewAudio){previewAudio.pause();previewAudio.removeAttribute('src');previewAudio.load();previewAudio=null;}
      if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
      if(playingButton){playingButton.textContent=t('Play');playingButton.setAttribute('aria-pressed','false');}
      playingButton=null;playingPath=null;
    }
    async function togglePreview(path, button){
      if(playingPath===path){stopPreview();return;}
      stopPreview();
      try {
        const segments=path.split('/').filter(Boolean);
        let folder=currentProjectDirectoryHandle;
        for(const segment of segments.slice(0,-1)) folder=await folder.getDirectoryHandle(segment);
        const file=await (await folder.getFileHandle(segments.at(-1))).getFile();
        previewUrl=URL.createObjectURL(file);
        previewAudio=new Audio(previewUrl);
        playingButton=button;playingPath=path;
        button.textContent=t('Stop');button.setAttribute('aria-pressed','true');
        previewAudio.addEventListener('ended',stopPreview,{once:true});
        await previewAudio.play();
      } catch(err){stopPreview();window.alert(`${t('Unable to play audio')}: ${err.message}`);}
    }
    let candidates=[];
    const selectedPaths=new Set();
    let missing=new Set();
    const existing=()=>normalizeAudioAssets(currentProjectData.audioAssets,currentProjectData.soundAssets);
    function refCount(id){return countProjectAudioReferences(currentProjectData,slideStates,id);}
    function refreshSoundUis(){
      projectStatus.refresh();
      refreshProjectBgmUi();
      refreshSlideBgmOverrideControls();
      refreshScenePresetBgmControls();
      refreshMultiSoundOverrideControls();
      // Rebuild other select elements whose options are derived from audio IDs.
      for (const select of document.querySelectorAll('select')) {
        if (select === slideBgmSoundSelect || select === scenePresetBgmSound) continue;
        if (select === multiPreviousSoundSelect || select === multiCurrentSoundSelect || select === multiNextSoundSelect) continue;
        if (!select.options.length) continue;
        if (select.dataset.audioAssetKind) {
          const value=select.value;
          const ids=getAvailableSoundAssetNames(select.dataset.audioAssetKind);
          setSelectOptions(select,value && !ids.includes(value) ? [...ids,value] : ids,value);
        }
      }
    }
    function render(){
      stopPreview();registeredList.replaceChildren();candidateList.replaceChildren();
      const assets=existing();
      const matches=a=>filter.value==='all'||a.type===filter.value;
      for(const [id,item] of Object.entries(assets).filter(([,item])=>matches(item))){
        const row=mk('div',null,'audio-review-row');
        const info=mk('div',null,'audio-review-info');
        info.append(mk('strong',item.label),mk('small',`${item.type.toUpperCase()} · ${id} · ${item.path}`));
        const refs=refCount(id);
        if(missing.has(id)) info.append(mk('span','Missing file','audio-review-missing'));
        const count=mk('small',`${t('References')}: ${refs}`);info.append(count);
        const play=btn('Play',()=>togglePreview(item.path,play));
        const labelButton=btn('Edit label',async ()=>{
          const label=await audioModal({title:'Edit label',label:'Audio label',value:item.label,validate:value=>!value?'Enter an audio label.':null});
          if(label===null) return;
          const settingsEdit = beginSettingsEdit();
          currentProjectData.audioAssets??={};
          currentProjectData.audioAssets[id]={...item,label:label.trim()};
          finishSettingsEdit(settingsEdit);
          refreshSoundUis();render();
        });
        const rename=btn('Rename ID',async ()=>{
          const next=await audioModal({title:'Rename ID',label:'Audio ID',value:id,message:`${t('Update audio references?')} ${id} (${refs})`,validate:value=>!value || !/^[A-Za-z0-9_-]+$/.test(value) || (value!==id && assets[value])?'Invalid or duplicate audio ID.':null});
          if(next===null || next===id)return;
          // Update persisted project references as well as the live slide data.
          const settingsEdit = beginSettingsEdit();
          renameProjectAudioReferences(currentProjectData,slideStates,id,next);
          projectAudioCache.delete(id);
          currentProjectData.audioAssets??={};
          delete currentProjectData.audioAssets[id];
          currentProjectData.audioAssets[next]={...item};
          if(currentProjectData.soundAssets) delete currentProjectData.soundAssets[id];
          finishSettingsEdit(settingsEdit);
          refreshSoundUis();render();
        });
        const remove=btn('Unregister',async ()=>{
          if(refs>0){
            await audioNotice({ title:'Unregister', message:'Audio is in use and cannot be unregistered.' });
            return;
          }
          const confirmed=await audioNotice({
            title:'Unregister',
            message:'Unregister this audio? The source file will not be deleted.',
            confirm:true,
          });
          if(!confirmed || refCount(id)>0)return;
          const settingsEdit = beginSettingsEdit();
          currentProjectData.audioAssets??={};
          delete currentProjectData.audioAssets[id];
          if(currentProjectData.soundAssets)delete currentProjectData.soundAssets[id];
          finishSettingsEdit(settingsEdit);
          refreshSoundUis();render();
          await audioNotice({ title:'Audio unregistered', message:'Save the project to persist changes.' });
        });
        row.append(info,play,labelButton,rename,remove);registeredList.append(row);
      }
      if(!registeredList.children.length)registeredList.append(mk('p','No registered audio for this category.'));
      for(const candidate of candidates.filter(matches)){
        const row=mk('div',null,'audio-review-row');
        const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=selectedPaths.has(candidate.path);
        checkbox.addEventListener('change',()=>{if(checkbox.checked)selectedPaths.add(candidate.path);else selectedPaths.delete(candidate.path);});
        const info=mk('div',null,'audio-review-info');info.append(mk('strong',candidate.label),mk('small',`${candidate.type.toUpperCase()} · ${candidate.path} · ${candidate.id}`));
        const play=btn('Play',()=>togglePreview(candidate.path,play));
        row.append(checkbox,info,play);candidateList.append(row);
      }
      if(!candidateList.children.length)candidateList.append(mk('p','No new audio files.'));
    }
    async function rescan(){
      stopPreview();
      status.textContent=t('Scanning audio folders...');
      try {
        candidates=await scanAudioDirectory(currentProjectDirectoryHandle,existing());
        missing=await missingAudioAssets(currentProjectDirectoryHandle,existing());
        status.textContent=`${t('New audio files')}: ${candidates.length} · ${t('Missing files')}: ${missing.size}`;
        render();
      }catch(error){status.textContent=`${t('Audio scan failed')}: ${error.message}`;}
    }
    filter.addEventListener('change',render);
    const controls=mk('div',null,'audio-review-actions library-manager-footer');
    const scan=btn('Rescan',()=>{void rescan();});
    const close=btn('Close',()=>dialog.close());
    const register=btn('Register selected',()=>{
      const settingsEdit = beginSettingsEdit();
      let count=0;
      currentProjectData.audioAssets??={};
      for(const candidate of candidates){
        if(!selectedPaths.has(candidate.path))continue;
        currentProjectData.audioAssets[candidate.id]={path:candidate.path,type:candidate.type,label:candidate.label};count++;
      }
      if(!count)return;
      finishSettingsEdit(settingsEdit);
      selectedPaths.clear();refreshSoundUis();
      void audioModal({title:'Audio registration complete',label:'Registered audio',value:String(count),inputEnabled:false,message:'Save the project to persist changes.'});
      void rescan();
    });
    controls.append(scan,register,close);dialog.append(controls);
    document.body.append(dialog);
    dialog.addEventListener('close',()=>{stopPreview();dialog.remove();},{once:true});
    dialog.showModal();
    await rescan();
  });
}
initializeAudioLibraryReview();


// Step 12K-4 preset editors and blank-slide insertion.
refreshPresetEditors = initializePresetSettingsEditor({
  readProject: () => currentProjectData,
  readSlides: () => slideStates,
  begin: beginSettingsEdit,
  finish: finishSettingsEdit,
  refresh: () => { refreshSharedSlideSettingsContextUi(); refreshSlideSettingsInspector(); renderTable(); },
  soundIds: () => getAvailableSoundAssetNames("sfx"),
}) ?? (() => {});
refreshPresetEditors();
for (const placement of ["before", "after"]) {
  // Insertion is now selected in slideInsertPlacementSelect; one Add action handles all positions.
}

// Replay is asynchronous when assets need loading. Prevent new edits during it.
for (const eventName of ["click", "pointerdown", "input", "change", "keydown"]) {
  document.addEventListener(eventName, event => {
    if (!editorHistoryBusy) return;
    event.preventDefault(); event.stopImmediatePropagation();
  }, true);
}

// UI-1A: the toolbar Open shortcut delegates to the existing Project open flow.
document.getElementById("toolbarOpenProjectButton")?.addEventListener("click", () => {
  document.getElementById("openProjectButton")?.click();
});

// UI-1B2: close the More dropdown on outside click, Escape and menu actions.
{
  const moreMenu = document.querySelector(".ui1a-more-tools");
  if (moreMenu) {
    document.addEventListener("pointerdown", (event) => {
      if (moreMenu.open && !moreMenu.contains(event.target)) moreMenu.open = false;
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && moreMenu.open) {
        moreMenu.open = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    moreMenu.querySelector(".ui1a-more-content")?.addEventListener("click", (event) => {
      if (event.target.closest("button")) moreMenu.open = false;
    });
  }
}

// Scene-3B: make the unified Selection Gizmo the primary entry point.
// Keep the original per-type DOM controls accessible in disclosures so older
// shortcuts, camera placement, numeric editors, and event listeners still work.
organizeLegacyTransformPanels({
  document,
  translate: t,
  onLanguageChange,
  onNavigate: () => {
    const target = document.getElementById('scene2uSelectionGizmo');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
});

// Scene-2U: first selection-toolbar render after project/editor initialization.
queueMicrotask(scene2uRefreshSelectionGizmo);

// Scene-3K: a single visible XYZ editor, with a deliberate scope switch.
// Directly reuse the absolute and selection-wide transform engines.
// Legacy controls remain hidden only for other historic listeners.
const scene3kRoot = document.getElementById('scene3kUnifiedEditor');
const scene3kFields = Object.fromEntries(['position','rotation','scale'].map(mode => [
  mode, 'XYZ'.split('').map(axis=>document.getElementById(`scene3k${mode[0].toUpperCase()+mode.slice(1)}${axis}`)),
]));
const scene3kSliders = Object.fromEntries(['position','rotation','scale'].map(mode => [
  mode, 'XYZ'.split('').map(axis=>document.getElementById(`scene3k${mode[0].toUpperCase()+mode.slice(1)}${axis}Slider`)),
]));
const scene3kApplyButtons = Object.fromEntries(['position','rotation','scale'].map(mode=>[
  mode, document.getElementById(`scene3kApply${mode[0].toUpperCase()+mode.slice(1)}`),
]));
const scene3kScaleLink = document.getElementById('scene3kScaleLink');
const scene3kError = document.getElementById('scene3kError');
const scene3oPositionRange = document.getElementById('scene3oPositionRange');
const scene3oExtrasSummary = document.getElementById('scene3oExtrasSummary');
const scene3oCameraExtras = document.getElementById('scene3oCameraExtras');
const scene3oGlowExtras = document.getElementById('scene3oGlowExtras');
const scene3kScope = 'selection'; // Scene-4J: numeric edits and Gizmo always target the explicit selection.
let scene3lMethod = 'delta';
let scene3lSelectionAbsoluteUniform = true;
let scene3uRelativeScaleLinked = true;
const scene3lMethodButtons = {absolute:document.getElementById('scene3lAbsoluteMethod'),delta:document.getElementById('scene3lDeltaMethod')};
let scene3kDraft = false;
const scene3nTouchedAxes = {position:new Set(),rotation:new Set(),scale:new Set()};
const scene3nClearTouched = () => Object.values(scene3nTouchedAxes).forEach(set=>set.clear());
const scene3nIsPerObjectAbsolute = () => scene3kScope==='selection' && scene3lMethod==='absolute';
function scene3nSelectedEntities() {
  return [
    ...getSelectedSlideEntries().filter(({slideState})=>!scene2oIsSlideHidden(slideState.id)).map(({slideState})=>({kind:'slide',slideState})),
    ...scene2cGetGroupAssets().map(entry=>({kind:'asset',...entry})),
  ];
}
function scene3nAbsoluteAxisValues() {
  const data=scene3nSelectedEntities().map(target=>scene3cReadAbsolute(target));
  if(!data.length) return null;
  return Object.fromEntries(['position','rotation','scale'].map(mode=>[mode,commonAbsoluteAxes(data,mode)]));
}

const scene3kDefaults = mode => relativeIdentity(mode);
const scene3kReadFields = mode => scene3kFields[mode].map(input=>Number(input.value));
const scene3kSelectedCount = () => getSelectedSlideEntries().filter(({slideState})=>!scene2oIsSlideHidden(slideState.id)).length + scene2cGetGroupAssets().length;
const scene3kCanOperate = () => isEditorMode() && !scenePreviewUi.previewName && (
  scene3kScope==='active' ? Boolean(scene3cGetExplicitActive()) : (scene3kSelectedCount()>0)
);
const scene3kSetError = key => { scene3kError.hidden=!key; scene3kError.textContent=key?t(key):''; };
function scene3kRefreshShared({force=false}={}) {
  if (!scene3kRoot) return;
  const active = scene3kScope === 'active';
  const target = scene3cGetExplicitActive();
  const usable = scene3kCanOperate();
  const activeData = scene3cReadAbsolute(target);
  const isAbsolute = scene3lMethod === 'absolute';
  for(const [method,button] of Object.entries(scene3lMethodButtons)) button.setAttribute('aria-pressed',String(method===scene3lMethod));
  document.getElementById('scene3lMethodHelp').textContent=scene3nIsPerObjectAbsolute() ? t('Selection absolute axes help') : t(`${active?'Active':'Selection'} ${isAbsolute?'absolute':'delta'} method help`);
  document.getElementById('scene3kTargetSummary').textContent=active
    ? (target ? `${target.kind==='slide' ? t('Slide') : t('Asset')} — ${target.kind==='slide' ? (target.slideState.label || target.slideState.id) : placedAssetDisplay(target.asset,currentProjectData?.assetLibrary)}` : t('Select an Active Object to edit its absolute transform'))
    : `${t('Selected transform targets')}: ${getSelectedSlideEntries().filter(({slideState})=>!scene2oIsSlideHidden(slideState.id)).length} ${t('Slides')}, ${scene2cGetGroupAssets().length} ${t('Assets')}`;
  const meaning = isAbsolute ? (active ? ['Absolute position','Absolute rotation','Absolute scale'] : ['Absolute position','Absolute rotation','Absolute scale']) : ['Relative movement','Relative rotation','Relative scale'];
  const absoluteReference = !active && isAbsolute ? scene3nAbsoluteAxisValues() : null;
  ['position','rotation','scale'].forEach((mode,mi)=>{
    document.getElementById(`scene3k${mode[0].toUpperCase()+mode.slice(1)}Meaning`).textContent=t(meaning[mi]);
    const values = isAbsolute ? (active ? activeData?.[mode] : absoluteReference?.[mode]) : scene3kDefaults(mode);
    scene3kFields[mode].forEach((input,i)=>{
      input.disabled=!usable;
      if (force || (!scene3kDraft && document.activeElement!==input)) {
        if (values && values[i]!==null && Number.isFinite(values[i])) input.value=String(Number(values[i].toFixed(4)));
        else input.value='';
        input.placeholder=scene3nIsPerObjectAbsolute() && values?.[i]===null ? t('Mixed') : '';
      }
      const slider=scene3kSliders[mode][i];
      slider.disabled=!usable;
      const value=Number(input.value);
      const mid=Number.isFinite(value)?value:scene3kDefaults(mode)[i];
      const range = mode==='rotation' ? 180 : mode==='scale' ? (isAbsolute?3:2) : Number(scene3oPositionRange?.value || 10);
      slider.min=String(mode==='scale'?0.01:mode==='position'?-Math.max(range,Math.ceil(Math.abs(mid))):Math.min(-range,Math.floor(mid)-1));
      slider.max=String(mode==='position'?Math.max(range,Math.ceil(Math.abs(mid))):Math.max(range,Math.ceil(mid)+1));
      slider.step=mode==='rotation'?'1':'0.01';
      if (document.activeElement!==slider) slider.value=String(Math.min(Number(slider.max),Math.max(Number(slider.min),mid)));
    });
    scene3kApplyButtons[mode].disabled=!usable;
    for(const button of scene3kRoot.querySelectorAll(`[data-scene3k-nudge^="${mode}:"]`)) button.disabled=!usable;
    for(const button of scene3kRoot.querySelectorAll(`[data-scene3k-reset="${mode}"]`)) button.disabled=!usable;
  });
  scene3kScaleLink.checked = active && isAbsolute ? scene3tActiveAbsoluteScaleLinked : (!active && isAbsolute ? scene3lSelectionAbsoluteUniform : scene3uRelativeScaleLinked);
  document.getElementById('scene3kScaleLinkLabel').textContent=t(active && isAbsolute?'Link XYZ scale':'Uniform');
  scene3kScaleLink.disabled=!usable;
  scene4jFocusOnly.disabled = !scene3cGetExplicitActive();
  scene4jClearSlides.disabled = getSelectedSlideEntries().length === 0;
  scene4jClearAssets.disabled = scene2cGetGroupAssets().length === 0;
  scene3oRefreshExtras();
}
function scene3kQueueSync() {
  if (!scene3kSyncReady || scene3kSyncQueued) return;
  scene3kSyncQueued = true;
  const session = scene3xTransformSession;
  queueMicrotask(() => {
    if (session !== scene3xTransformSession) return;
    scene3kSyncQueued = false;
    if (scene3kSyncReady) scene3kRefreshShared();
  });
}
// Only ephemeral editor state is reset: project data, user preferences and
// undo history are managed independently. A previous project's queued sync
// must never render into the newly opened project's controls.
function scene3xResetTransformSession() {
  scene3xTransformSession++;
  scene3kSyncQueued = false;
  scene3kDraft = false;
  scene3nClearTouched();
  scene3kSetError(null);
}
function scene3lSetMethod(method) {
  if(method!=='absolute' && method!=='delta')return;
  scene3lMethod=method;
  scene3nClearTouched();
  scene3kDraft=false;
  scene3kSetError(null);
  scene3kRefreshShared({force:true});
}
for(const [method,button] of Object.entries(scene3lMethodButtons)) button.addEventListener('click',()=>scene3lSetMethod(method));
// Scene-4J: selection is the only numeric-transform scope. Current is independent.
function scene4jUpdateSelection() {
  scene3nClearTouched();
  scene3kDraft = false;
  scene3kSetError(null);
  renderSlideThumbnails();
  refreshSceneAssetEditor();
  scene2cUpdateGroupStatus();
  scene2uRefreshSelectionGizmo();
  scene3kRefreshShared({force:true});
  document.dispatchEvent(new Event('slidespace:selection-changed'));
}
const scene4jFocusOnly = document.getElementById('scene4jFocusOnly');
const scene4jClearSlides = document.getElementById('scene4jClearSlides');
const scene4jClearAssets = document.getElementById('scene4jClearAssets');
scene4jFocusOnly.addEventListener('click', () => {
  const focus = scene3cGetExplicitActive();
  if (!focus) return;
  selectedSlideIds.clear();
  scene2fClearAssetSelection();
  canvasSelectedAssetIds.clear();
  if (focus.kind === 'slide') {
    selectedSlideIds.add(focus.slideState.id);
    scene2yActiveSlideId = focus.slideState.id;
    slideSelectionAnchorIndex = slideStates.findIndex(slide => slide.id === focus.slideState.id);
    selectedSceneAssetId = null;
  } else {
    scene2fSelectAsset(focus.presetName, focus.asset.id);
    if (focus.presetName === editingScenePresetName) canvasSelectedAssetIds.add(focus.asset.id);
    selectedSceneAssetId = focus.asset.id;
    scene2yActiveSlideId = null;
  }
  // Do not move Current or the camera: focus and selection are independent.
  scene4jUpdateSelection();
});
scene4jClearSlides.addEventListener('click', () => {
  selectedSlideIds.clear();
  slideSelectionAnchorIndex = null;
  scene2yActiveSlideId = null;
  scene4jUpdateSelection();
});
scene4jClearAssets.addEventListener('click', () => {
  scene2fClearAssetSelection();
  canvasSelectedAssetIds.clear();
  selectedSceneAssetId = null;
  scene4cAssetSelectionCleared = true;
  scene4jUpdateSelection();
});
scene3oPositionRange?.addEventListener('change',()=>scene3kRefreshShared({force:false}));
scene3kScaleLink.addEventListener('change',()=>{
  if(scene3kScope==='active' && scene3lMethod==='absolute') scene3tActiveAbsoluteScaleLinked=scene3kScaleLink.checked;
  else if(scene3kScope==='selection' && scene3lMethod==='absolute') scene3lSelectionAbsoluteUniform=scene3kScaleLink.checked;
  else scene3uRelativeScaleLinked=scene3kScaleLink.checked;
});
// Scene-3N: apply identical absolute values only on explicitly changed axes.
// Untouched Mixed axes retain each object's original value; Current is never implicit.
function scene3nApplySelectionAbsolute(mode, axes, fields) {
  if(!axes.length) return false;
  const targets=scene3nSelectedEntities();
  if(!targets.length) return false;
  const requested={};
  for(const axis of axes){
    const input=fields[axis];
    const n=Number(input.value);
    if(!input.value.trim() || input.validity.badInput || !Number.isFinite(n)){scene3kSetError('Enter valid numbers for X, Y and Z');return false;}
    if(mode==='scale' && n<=0){scene3kSetError('Scale values must be greater than zero');return false;}
    requested[axis]=n;
  }
  const history={type:'scene2c-group-transform',presetName:editingScenePresetName,assets:[],slides:[]};
  for(const target of targets){
    const beforeValues=scene3cReadAbsolute(target)[mode];
    const nextValues=assignAbsoluteAxes(beforeValues,requested,{linkScale:mode==='scale' && scene3kScaleLink.checked});
    if(nextValues.every((n,i)=>Math.abs(n-beforeValues[i])<1e-8))continue;
    if(target.kind==='slide'){
      const slide=target.slideState;
      const before=createSlideTransformHistorySnapshot(slide);
      if(mode==='position'){
        const delta=Vector3.FromArray(nextValues).subtract(before.position);
        slide.position=Vector3.FromArray(nextValues);
        slide.cameraPosition=before.cameraPosition.add(delta);
      }else if(mode==='rotation'){
        slide.rotationQuaternion=Quaternion.FromEulerAngles(...nextValues.map(deg=>deg*Math.PI/180));
        syncCameraPoseAfterSlideTransform(slide,before);
      }else slide.slideScale={x:nextValues[0],y:nextValues[1],z:nextValues[2]};
      applySlideTransformStateToMesh(slide);
      history.slides.push({slideId:slide.id,before,after:createSlideTransformHistorySnapshot(slide)});
    }else{
      const {asset,presetName}=target;
      const before=cloneAssetTransform(ensureAssetTransform(asset));
      const next=cloneAssetTransform(before);
      if(mode==='position')next.position=nextValues;
      else if(mode==='rotation')next.rotation=quaternionToArray(Quaternion.FromEulerAngles(...nextValues.map(deg=>deg*Math.PI/180)));
      else next.scale=nextValues;
      asset.transform=next;
      const loaded=getLoadedAssetByPresetAndId(presetName,asset.id);
      if(loaded?.rootNode){applyAssetTransform(loaded.rootNode,asset);loaded.rootNode.computeWorldMatrix(true);}
      history.assets.push({presetName,assetId:asset.id,before,after:cloneAssetTransform(next)});
    }
  }
  if(!history.assets.length && !history.slides.length)return false;
  pushEditorHistory(history);
  refreshSharedTransformControls();
  refreshSelectedAssetTransformInputs();
  renderTable();
  return true;
}
function scene3kApply(mode) {
  if(!scene3kCanOperate())return false;
  const fields=scene3kFields[mode];
  const values=scene3kReadFields(mode);
  if(scene3nIsPerObjectAbsolute()){
    const applied=scene3nApplySelectionAbsolute(mode,[...scene3nTouchedAxes[mode]],fields);
    if(applied){scene3nClearTouched();scene3kDraft=false;scene3kSetError(null);scene3kRefreshShared({force:true});}
    return applied;
  }
  if(fields.some(input=>!input.value.trim() || input.validity.badInput) || values.some(x=>!Number.isFinite(x))) {
    scene3kSetError('Enter valid numbers for X, Y and Z');return false;
  }
  if(mode==='scale' && values.some(x=>x<=0)) {scene3kSetError('Scale values must be greater than zero');return false;}
  scene3kSetError(null);
  if (scene3kScope==='active') {
    let absoluteValues=values;
    if(scene3lMethod==='delta') {
      const current=scene3cReadAbsolute(scene3cGetExplicitActive())?.[mode];
      absoluteValues=absoluteTargetFromDelta(mode,current,values);
      if(!absoluteValues) return false;
    }
    if(mode==='scale' && scene3lMethod==='delta' && scene3kScaleLink.checked) {
      const base=scene3cReadAbsolute(scene3cGetExplicitActive())?.scale;
      const factor=values[scene3kLastEditedScaleAxis];
      absoluteValues=base?.map(value=>value*factor);
    }
    // Call the absolute engine directly: no hidden input writes or synthetic clicks.
    scene3cApplyAbsolute(mode,{
      requestedValues:absoluteValues,
      linkedScale:mode==='scale' && scene3lMethod==='absolute' && scene3kScaleLink.checked,
      linkedAxis:mode==='scale' ? scene3kLastEditedScaleAxis : null,
    });
  } else {
    // The Selection/Absolute branch above sets each target directly.
    // Only relative values reach this branch.
    const relativeValues=values;
    // Selection Absolute is handled above through per-object assignment.
    // Direct engine calls preserve shared history without depending on the
    // invisible Scene-3J relative-input DOM or legacy Apply buttons.
    if(mode==='position') scene2vApplyTranslation(relativeValues);
    else {
      const requested=[...relativeValues];
      if(mode==='scale' && scene3kScaleLink.checked) {
        const factor=requested[scene3kLastEditedScaleAxis] ?? requested[0];
        requested.fill(factor);
      }
      scene2vApplySelectionNumeric(mode,requested,false);
    }
  }
  scene3kDraft=false;
  scene3kRefreshShared({force:true});
  return true;
}
const scene4qCancelledSliders = new WeakSet();
let scene3kLastEditedScaleAxis=0;
for(const [mode,button] of Object.entries(scene3kApplyButtons))button.addEventListener('click',()=>scene3kApply(mode));
for(const [mode,fields] of Object.entries(scene3kFields)){
  fields.forEach((input,i)=>{
    input.addEventListener('input',()=>{scene3kDraft=true;scene3nTouchedAxes[mode].add(i);if(mode==='scale')scene3kLastEditedScaleAxis=i;});
    input.addEventListener('keydown',event=>{
      if(event.key==='Enter'){event.preventDefault();scene3kApply(mode);input.blur();}
      if(event.key==='Escape'){event.preventDefault();scene3nClearTouched();scene3kDraft=false;scene3kSetError(null);scene3kRefreshShared({force:true});input.blur();}
    });
    // Scene-4Q: slider changes are preview-only until `change` commits one
    // history item. Escape discards the draft, even if blur follows it.
    const sliderInput = scene3kSliders[mode][i];
    sliderInput.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      scene4qCancelledSliders.add(sliderInput);
      scene3nClearTouched();
      scene3kDraft = false;
      scene3kSetError(null);
      sliderInput.blur();
      scene3kRefreshShared({force:true});
    });
    sliderInput.addEventListener('input',event=>{
      scene4qCancelledSliders.delete(sliderInput);
      const value=Number(event.target.value);
      if(scene3kScope==='active' && scene3lMethod==='absolute' && mode==='scale' && scene3kScaleLink.checked) {
        const base=scene3cReadAbsolute(scene3cGetExplicitActive())?.scale;
        if(base && base[i]>0) scene3kFields.scale.forEach((f,j)=>f.value=String(Number((base[j]*value/base[i]).toFixed(5))));
      } else if(mode==='scale' && scene3lMethod==='delta' && scene3kScaleLink.checked) {
        scene3kFields.scale.forEach(field=>field.value=String(value));
      } else input.value=String(value);
      scene3kLastEditedScaleAxis=i;
      scene3nTouchedAxes[mode].add(i);
      scene3kDraft=true;
    });
    scene3kSliders[mode][i].addEventListener('change',()=>{
      if (scene4qCancelledSliders.delete(sliderInput)) return;
      scene3kApply(mode);
    });
  });
}
for(const button of scene3kRoot.querySelectorAll('[data-scene3k-nudge]'))button.addEventListener('click',()=>{
  if(!scene3kCanOperate())return;
  const [mode,axis,sign]=button.dataset.scene3kNudge.split(':');
  const i='XYZ'.indexOf(axis);
  const step=mode==='rotation'?5:mode==='scale'?0.1:0.1;
  const values=scene3kReadFields(mode);
  if(!Number.isFinite(values[i])) values[i]=mode==='scale'?1:0;
  values[i]=Number((values[i]+Number(sign)*step).toFixed(5));
  scene3nTouchedAxes[mode].add(i);
  if(mode==='scale' && values[i]<=0)return;
  scene3kLastEditedScaleAxis=i;
  if(mode==='scale' && scene3kScaleLink.checked && scene3kScope==='active' && scene3lMethod==='absolute') {
    const base=scene3cReadAbsolute(scene3cGetExplicitActive())?.scale;
    if(base?.[i]>0) values.forEach((_,j)=>values[j]=Number((base[j]*values[i]/base[i]).toFixed(5)));
  }
  if(mode==='scale' && scene3kScaleLink.checked && scene3lMethod==='delta') values.fill(values[i]);
  scene3kFields[mode].forEach((field,j)=>field.value=String(values[j]));
  scene3kDraft=true;
  scene3kApply(mode);
});
for(const button of scene3kRoot.querySelectorAll('[data-scene3k-reset]'))button.addEventListener('click',()=>{
  const mode=button.dataset.scene3kReset;
  scene3kFields[mode].forEach((field,i)=>field.value=String(scene3kDefaults(mode)[i]));
  if(scene3nIsPerObjectAbsolute()) [0,1,2].forEach(i=>scene3nTouchedAxes[mode].add(i));
  scene3kDraft=true;
  if(scene3lMethod==='absolute') scene3kApply(mode); // absolute reset edits target values
  else {scene3kDraft=false;scene3kRefreshShared({force:true});} // delta reset clears input only
});
onLanguageChange(()=>scene3kRefreshShared());
scene3kSyncReady = true;
queueMicrotask(()=>scene3kRefreshShared({force:true}));
