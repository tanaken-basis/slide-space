// Slide copy/paste data transformation only. No scene resources or history mutations.
import { Vector3, Quaternion } from "@babylonjs/core";
import { normalizeSlideImagePath } from "./filePathUtils.js";
import {
  normalizeSlideScale,
  normalizeSlideBgmOverride,
  normalizeSlideAutoPlayOverride,
} from "./projectData.js";

export const createSlideClipboardSnapshot = function (slideState) {
  if (!slideState) {
    return null;
  }

  return {
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

    transitionPreset: slideState.transitionPreset ?? "default",

    transitionOverride: structuredClone(slideState.transitionOverride ?? {}),

    soundPreset: slideState.soundPreset ?? "default",

    soundOverride: structuredClone(slideState.soundOverride ?? {}),

    bgmOverride: normalizeSlideBgmOverride(slideState.bgmOverride),

    autoPlayOverride: normalizeSlideAutoPlayOverride(
      slideState.autoPlayOverride,
    ),

    interaction: structuredClone(slideState.interaction ?? {type:slideState.action ? "open-url" : "none", url:slideState.action ?? ""}),
    action: slideState.action ?? "",
  };
};

export const createSlideStateFromClipboard = function (snapshot, createUniqueSlideId) {
  if (!snapshot) {
    return null;
  }

  const newId = createUniqueSlideId();

  return {
    id: newId,

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

    transitionPreset: snapshot.transitionPreset ?? "default",

    transitionOverride: structuredClone(snapshot.transitionOverride ?? {}),

    soundPreset: snapshot.soundPreset ?? "default",

    soundOverride: structuredClone(snapshot.soundOverride ?? {}),

    bgmOverride: normalizeSlideBgmOverride(snapshot.bgmOverride),

    autoPlayOverride: normalizeSlideAutoPlayOverride(snapshot.autoPlayOverride),

    action: snapshot.action ?? "",

    // Runtime
    imageUrl: null,

    mesh: null,
  };
};


// Duplicate shares the clipboard's slide data normalization and deep-copy logic.
// Unlike Paste, Duplicate keeps the source's live thumbnail URL; the scene
// mesh is still restored separately by main.js.
export const createSlideDuplicateState = function (source, createUniqueSlideId) {
  const snapshot = createSlideClipboardSnapshot(source);
  if (!snapshot) return null;

  const duplicate = createSlideStateFromClipboard(snapshot, createUniqueSlideId);
  duplicate.imageUrl = source.imageUrl ?? null;
  return duplicate;
};
