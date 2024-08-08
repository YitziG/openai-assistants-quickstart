"use client";

import { useEffect } from 'react';

const CanvasComponent = () => {
    useEffect(() => {
        const loadScript = (src) => {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.onload = resolve;
                script.onerror = reject;
                document.body.appendChild(script);
            });
        };

        const loadScriptsInOrder = async () => {
            try {
                await loadScript('/js/libs.core.js');
                await loadScript('/js/cables.js');
                await loadScript('/js/ops.js');
                await loadScript('/js/cgl_shadermodifier.js');
                await loadScript('/js/cgl_copytexture.js');

                const scriptInit = document.createElement('script');
                scriptInit.innerHTML = `
          function showError(errId, errMsg) {
            // handle critical errors here if needed
          }

          function patchInitialized(patch) {
            // You can now access the patch object (patch), register variable watchers and so on
          }

          function patchFinishedLoading(patch) {
            // The patch is ready now, all assets have been loaded
          }

          document.addEventListener("CABLES.jsLoaded", function (event) {
            CABLES.patch = new CABLES.Patch({
              patchFile: 'js/SPELL_OF_THE_UNOWN.json',
              "prefixAssetPath": "",
              "assetPath": "assets/",
              "jsPath": "js/",
              "glCanvasId": "glcanvas",
              "glCanvasResizeToWindow": true,
              "onError": showError,
              "onPatchLoaded": patchInitialized,
              "onFinishedLoading": patchFinishedLoading,
              "canvas": {"alpha":true, "premultipliedAlpha":true } // make canvas transparent
            });
          });

          // disable rubberband effect on mobile devices
          document.getElementById('glcanvas').addEventListener('touchmove', (e) => { e.preventDefault(); }, false);
        `;
                document.body.appendChild(scriptInit);
                document.querySelector('.sidebar-cables').remove();
            } catch (error) {
                console.error('Error loading scripts:', error);
            }
        };

        loadScriptsInOrder();

        return () => {
            const scripts = document.querySelectorAll('script[src^="/js/"], script[innerHTML*="CABLES.jsLoaded"]');
            scripts.forEach(script => script.remove());
        };
    }, []);

    return <canvas id="glcanvas" width="100vw" height="100vh" tabIndex="1"></canvas>;
};

export default CanvasComponent;