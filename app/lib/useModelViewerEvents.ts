import { type MutableRefObject, useCallback, useLayoutEffect, useRef } from "react";

type Handlers = {
  load?: (viewer: any) => void;
  error?: (viewer: any) => void;
};

/**
 * model-viewer 4.3.1 bug: changing `scale` outside an AR session calls
 * arRenderer.onUpdateScene(), which throws on a null scene and skips the
 * redraw. Only let it run while an AR scene is actually presented.
 */
const guardArSceneUpdates = (el: any) => {
  try {
    let proto = Object.getPrototypeOf(el);
    while (proto && proto !== HTMLElement.prototype) {
      const sym = Object.getOwnPropertySymbols(proto).find((s) => s.description === "renderer");
      if (sym) {
        const ar = el[sym]?.arRenderer;
        if (ar && !ar.__qraveGuarded && typeof ar.onUpdateScene === "function") {
          const original = ar.onUpdateScene;
          ar.onUpdateScene = (...args: unknown[]) => (ar.presentedScene ? original(...args) : undefined);
          ar.__qraveGuarded = true;
        }
        return;
      }
      proto = Object.getPrototypeOf(proto);
    }
  } catch {
    // Internal shape changed in a newer model-viewer; nothing to patch.
  }
};

/**
 * React doesn't wire `onLoad` / `onError` props to the <model-viewer> custom
 * element, so those handlers never run. This returns a ref callback that
 * listens for the element's real `load` / `error` events instead.
 *
 *   const viewerRef = useModelViewerEvents({ load: (v) => ... }, sharedRef);
 *   <model-viewer ref={viewerRef} ... />
 */
export function useModelViewerEvents(handlers: Handlers, sharedRef?: MutableRefObject<any>) {
  const latest = useRef(handlers);
  useLayoutEffect(() => {
    latest.current = handlers;
  });

  return useCallback(
    (el: any) => {
      if (sharedRef) sharedRef.current = el;
      if (!el) return;
      guardArSceneUpdates(el);
      const onLoad = () => latest.current.load?.(el);
      const onError = () => latest.current.error?.(el);
      el.addEventListener("load", onLoad);
      el.addEventListener("error", onError);
      if (el.loaded) queueMicrotask(onLoad);
      return () => {
        el.removeEventListener("load", onLoad);
        el.removeEventListener("error", onError);
        if (sharedRef && sharedRef.current === el) sharedRef.current = null;
      };
    },
    [sharedRef],
  );
}
