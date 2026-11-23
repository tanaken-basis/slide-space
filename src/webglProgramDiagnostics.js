/** Scene-4K opt-in WebGL diagnostic. Never change WebGL results or suppress errors.
 * Enabled with ?debugWebgl=1; captures the first few invalid program queries.
 * If the driver emits an error outside of JavaScript WebGL calls this probe
 * cannot attribute it, and that limitation should be reported explicitly.
 */
export function installWebglProgramDiagnostics({enabled=false, logger=console, globalScope=globalThis}={}) {
  if (!enabled) return () => {};
  const originals = [];
  for (const typeName of ['WebGLRenderingContext','WebGL2RenderingContext']) {
    const proto = globalScope[typeName]?.prototype;
    if (!proto || typeof proto.getProgramParameter !== 'function') continue;
    const ownOriginal = Object.getOwnPropertyDescriptor(proto, 'getProgramParameter');
    if (!ownOriginal || typeof ownOriginal.value !== 'function' || !ownOriginal.configurable) continue;
    const original = ownOriginal.value;
    let invalidCount = 0;
    const wrapped = function(program, parameter) {
      // This is deliberately observational; getProgramParameter is always called.
      let invalid = program == null;
      if (!invalid && typeof this.isProgram === 'function') {
        try { invalid = !this.isProgram(program); } catch { /* preserve original behavior */ }
      }
      if (invalid) {
        invalidCount += 1;
        if (invalidCount <= 3) logger.warn('[SlideSpace WebGL diagnostic] invalid getProgramParameter target', {
          context: typeName, parameter, occurrence: invalidCount,
          stack: new Error().stack,
        });
      }
      return original.call(this, program, parameter);
    };
    Object.defineProperty(proto,'getProgramParameter',{...ownOriginal,value:wrapped});
    originals.push(() => {if (proto.getProgramParameter === wrapped) Object.defineProperty(proto,'getProgramParameter',ownOriginal);});
  }
  return () => originals.reverse().forEach(undo => undo());
}
