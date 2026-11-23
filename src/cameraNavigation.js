/** Camera-1: pointer navigation without Babylon's built-in mouse input.
 * Camera pose is always written through onPoseChanged, so the slide transition
 * interpolator cannot overwrite the manually manipulated camera.
 */
import { normalizeCameraNavigationSettings, DEFAULT_CAMERA_NAVIGATION_SETTINGS } from './cameraNavigationSettings.js';

export function createCameraNavigation({ canvas, getCamera, getOrbitTarget, onPoseChanged,
  Vector3, Quaternion, onModeChange = () => {} }) {
  let active = false;
  let suspended = false;
  let rotationMode = 'look';
  let drag = null;
  let settings = { ...DEFAULT_CAMERA_NAVIGATION_SETTINGS };
  const ROTATE = 0.004;
  const PAN = 0.002;
  const DOLLY = 0.012;

  function sync() { onPoseChanged?.(); }
  function rotate(dx, dy) {
    const camera = getCamera();
    if (!camera) return;
    if (!camera.rotationQuaternion) camera.rotationQuaternion = Quaternion.Identity();
    const old = camera.rotationQuaternion;
    // Yaw around world up; pitch around the yawed camera's local right axis.
    const yaw = Quaternion.RotationAxis(Vector3.Up(), dx * ROTATE * settings.rotateSensitivity * (settings.invertX ? -1 : 1));
    const pitch = Quaternion.RotationAxis(Vector3.Right(), dy * ROTATE * settings.rotateSensitivity * (settings.invertY ? -1 : 1));
    const next = yaw.multiply(old).multiply(pitch).normalize();
    if (rotationMode === 'orbit') {
      const target = getOrbitTarget?.();
      if (target) {
        const offset = camera.position.subtract(target);
        const delta = next.multiply(old.conjugate()).normalize();
        const turn = new Vector3(0,0,0);
        offset.rotateByQuaternionToRef(delta, turn);
        camera.position.copyFrom(target.add(turn));
      }
    }
    camera.rotationQuaternion = next;
    sync();
  }
  function pan(dx, dy) {
    const camera = getCamera();
    if (!camera) return;
    const dist = Math.max(0.5, getOrbitTarget?.() ? Vector3.Distance(camera.position,getOrbitTarget()) : 5);
    const scale = PAN * dist * settings.panSensitivity;
    camera.position.addInPlace(camera.getDirection(Vector3.Right()).scale(-dx*scale));
    camera.position.addInPlace(camera.getDirection(Vector3.Up()).scale(dy*scale));
    sync();
  }
  function dolly(amount) {
    const camera = getCamera();
    if (!camera) return;
    const target = getOrbitTarget?.();
    const dist = Math.max(0.5, target ? Vector3.Distance(camera.position,target) : 5);
    const delta = Math.max(-dist * 0.5, Math.min(dist * 0.5, amount * DOLLY * dist * settings.dollySensitivity));
    camera.position.addInPlace(camera.getDirection(Vector3.Forward()).scale(delta));
    sync();
  }
  function chooseMode(event) {
    if (event.button === 0 && event.shiftKey) return 'pan';
    if (event.button === 1) return settings.middleButtonAction;
    if (event.button === 2) return settings.rightButtonAction;
    if (event.button === 0) return 'rotate';
    return null;
  }
  function down(event) {
    if (!active || suspended || event.target !== canvas || drag) return;
    const mode = chooseMode(event);
    if (!mode) return;
    event.preventDefault();
    drag = { id:event.pointerId, x:event.clientX, y:event.clientY, mode };
    try {canvas.setPointerCapture(event.pointerId);} catch {}
  }
  function move(event) {
    if (!active || suspended || !drag || drag.id !== event.pointerId) return;
    event.preventDefault();
    const dx=event.clientX-drag.x, dy=event.clientY-drag.y;
    drag.x=event.clientX; drag.y=event.clientY;
    if (drag.mode==='rotate') rotate(dx,dy);
    else if (drag.mode==='pan') pan(dx,dy);
    else dolly(dy * (settings.invertDolly ? -1 : 1));
  }
  function up(event) {
    if (!drag || drag.id!==event.pointerId) return;
    drag=null;
    try {if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);} catch {}
  }
  function wheel(event) {
    if (!active || suspended || event.target!==canvas) return;
    if (event.cancelable) event.preventDefault();
    dolly(-Math.sign(event.deltaY)*Math.min(Math.abs(event.deltaY),120)/60 * settings.wheelSensitivity * (settings.invertWheel ? -1 : 1));
  }
  function context(event) {if(active && !suspended && event.target===canvas) event.preventDefault();}
  canvas.addEventListener('pointerdown',down);
  canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',up);
  canvas.addEventListener('pointercancel',up);
  canvas.addEventListener('lostpointercapture',up);
  canvas.addEventListener('wheel',wheel,{passive:false});
  canvas.addEventListener('contextmenu',context);
  return {
    start(){active=true; suspended=false;},
    stop(){active=false; drag=null;},
    suspend(){suspended=true; drag=null;},
    resume(){suspended=false;},
    setRotationMode(mode){rotationMode=mode==='orbit'?'orbit':'look';onModeChange(rotationMode);},
    getRotationMode(){return rotationMode;},
    setSettings(value){ settings=normalizeCameraNavigationSettings(value); return this.getSettings(); },
    getSettings(){return {...settings};},
    dispose(){this.stop();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('contextmenu',context);}
  };
}
