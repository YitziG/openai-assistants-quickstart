"use strict";

var CABLES=CABLES||{};
CABLES.OPS=CABLES.OPS||{};

var Ops=Ops || {};
Ops.Gl=Ops.Gl || {};
Ops.Anim=Ops.Anim || {};
Ops.Math=Ops.Math || {};
Ops.Array=Ops.Array || {};
Ops.Color=Ops.Color || {};
Ops.Number=Ops.Number || {};
Ops.String=Ops.String || {};
Ops.Boolean=Ops.Boolean || {};
Ops.Devices=Ops.Devices || {};
Ops.Sidebar=Ops.Sidebar || {};
Ops.Trigger=Ops.Trigger || {};
Ops.Gl.Matrix=Ops.Gl.Matrix || {};
Ops.Gl.Meshes=Ops.Gl.Meshes || {};
Ops.Gl.Shader=Ops.Gl.Shader || {};
Ops.Gl.ImageCompose=Ops.Gl.ImageCompose || {};
Ops.Devices.Keyboard=Ops.Devices.Keyboard || {};
Ops.Gl.ShaderEffects=Ops.Gl.ShaderEffects || {};
Ops.Gl.ImageCompose.Noise=Ops.Gl.ImageCompose.Noise || {};



// **************************************************************
// 
// Ops.Gl.MainLoop
// 
// **************************************************************

Ops.Gl.MainLoop = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    fpsLimit = op.inValue("FPS Limit", 0),
    trigger = op.outTrigger("trigger"),
    width = op.outNumber("width"),
    height = op.outNumber("height"),
    reduceFocusFPS = op.inValueBool("Reduce FPS not focussed", false),
    reduceLoadingFPS = op.inValueBool("Reduce FPS loading"),
    clear = op.inValueBool("Clear", true),
    clearAlpha = op.inValueBool("ClearAlpha", true),
    fullscreen = op.inValueBool("Fullscreen Button", false),
    active = op.inValueBool("Active", true),
    hdpi = op.inValueBool("Hires Displays", false),
    inUnit = op.inSwitch("Pixel Unit", ["Display", "CSS"], "Display");

op.onAnimFrame = render;
hdpi.onChange = function ()
{
    if (hdpi.get()) op.patch.cgl.pixelDensity = window.devicePixelRatio;
    else op.patch.cgl.pixelDensity = 1;

    op.patch.cgl.updateSize();
    if (CABLES.UI) gui.setLayout();
};

active.onChange = function ()
{
    op.patch.removeOnAnimFrame(op);

    if (active.get())
    {
        op.setUiAttrib({ "extendTitle": "" });
        op.onAnimFrame = render;
        op.patch.addOnAnimFrame(op);
        op.log("adding again!");
    }
    else
    {
        op.setUiAttrib({ "extendTitle": "Inactive" });
    }
};

const cgl = op.patch.cgl;
let rframes = 0;
let rframeStart = 0;
let timeOutTest = null;
let addedListener = false;

if (!op.patch.cgl) op.uiAttr({ "error": "No webgl cgl context" });

const identTranslate = vec3.create();
vec3.set(identTranslate, 0, 0, 0);
const identTranslateView = vec3.create();
vec3.set(identTranslateView, 0, 0, -2);

fullscreen.onChange = updateFullscreenButton;
setTimeout(updateFullscreenButton, 100);
let fsElement = null;

let winhasFocus = true;
let winVisible = true;

window.addEventListener("blur", () => { winhasFocus = false; });
window.addEventListener("focus", () => { winhasFocus = true; });
document.addEventListener("visibilitychange", () => { winVisible = !document.hidden; });
testMultiMainloop();

cgl.mainloopOp = this;

inUnit.onChange = () =>
{
    width.set(0);
    height.set(0);
};

function getFpsLimit()
{
    if (reduceLoadingFPS.get() && op.patch.loading.getProgress() < 1.0) return 5;

    if (reduceFocusFPS.get())
    {
        if (!winVisible) return 10;
        if (!winhasFocus) return 30;
    }

    return fpsLimit.get();
}

function updateFullscreenButton()
{
    function onMouseEnter()
    {
        if (fsElement)fsElement.style.display = "block";
    }

    function onMouseLeave()
    {
        if (fsElement)fsElement.style.display = "none";
    }

    op.patch.cgl.canvas.addEventListener("mouseleave", onMouseLeave);
    op.patch.cgl.canvas.addEventListener("mouseenter", onMouseEnter);

    if (fullscreen.get())
    {
        if (!fsElement)
        {
            fsElement = document.createElement("div");

            const container = op.patch.cgl.canvas.parentElement;
            if (container)container.appendChild(fsElement);

            fsElement.addEventListener("mouseenter", onMouseEnter);
            fsElement.addEventListener("click", function (e)
            {
                if (CABLES.UI && !e.shiftKey) gui.cycleFullscreen();
                else cgl.fullScreen();
            });
        }

        fsElement.style.padding = "10px";
        fsElement.style.position = "absolute";
        fsElement.style.right = "5px";
        fsElement.style.top = "5px";
        fsElement.style.width = "20px";
        fsElement.style.height = "20px";
        fsElement.style.cursor = "pointer";
        fsElement.style["border-radius"] = "40px";
        fsElement.style.background = "#444";
        fsElement.style["z-index"] = "9999";
        fsElement.style.display = "none";
        fsElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" id=\"Capa_1\" x=\"0px\" y=\"0px\" viewBox=\"0 0 490 490\" style=\"width:20px;height:20px;\" xml:space=\"preserve\" width=\"512px\" height=\"512px\"><g><path d=\"M173.792,301.792L21.333,454.251v-80.917c0-5.891-4.776-10.667-10.667-10.667C4.776,362.667,0,367.442,0,373.333V480     c0,5.891,4.776,10.667,10.667,10.667h106.667c5.891,0,10.667-4.776,10.667-10.667s-4.776-10.667-10.667-10.667H36.416     l152.459-152.459c4.093-4.237,3.975-10.99-0.262-15.083C184.479,297.799,177.926,297.799,173.792,301.792z\" fill=\"#FFFFFF\"/><path d=\"M480,0H373.333c-5.891,0-10.667,4.776-10.667,10.667c0,5.891,4.776,10.667,10.667,10.667h80.917L301.792,173.792     c-4.237,4.093-4.354,10.845-0.262,15.083c4.093,4.237,10.845,4.354,15.083,0.262c0.089-0.086,0.176-0.173,0.262-0.262     L469.333,36.416v80.917c0,5.891,4.776,10.667,10.667,10.667s10.667-4.776,10.667-10.667V10.667C490.667,4.776,485.891,0,480,0z\" fill=\"#FFFFFF\"/><path d=\"M36.416,21.333h80.917c5.891,0,10.667-4.776,10.667-10.667C128,4.776,123.224,0,117.333,0H10.667     C4.776,0,0,4.776,0,10.667v106.667C0,123.224,4.776,128,10.667,128c5.891,0,10.667-4.776,10.667-10.667V36.416l152.459,152.459     c4.237,4.093,10.99,3.975,15.083-0.262c3.992-4.134,3.992-10.687,0-14.82L36.416,21.333z\" fill=\"#FFFFFF\"/><path d=\"M480,362.667c-5.891,0-10.667,4.776-10.667,10.667v80.917L316.875,301.792c-4.237-4.093-10.99-3.976-15.083,0.261     c-3.993,4.134-3.993,10.688,0,14.821l152.459,152.459h-80.917c-5.891,0-10.667,4.776-10.667,10.667s4.776,10.667,10.667,10.667     H480c5.891,0,10.667-4.776,10.667-10.667V373.333C490.667,367.442,485.891,362.667,480,362.667z\" fill=\"#FFFFFF\"/></g></svg>";
    }
    else
    {
        if (fsElement)
        {
            fsElement.style.display = "none";
            fsElement.remove();
            fsElement = null;
        }
    }
}

op.onDelete = function ()
{
    cgl.gl.clearColor(0, 0, 0, 0);
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
};

function render(time)
{
    if (!active.get()) return;
    if (cgl.aborted || cgl.canvas.clientWidth === 0 || cgl.canvas.clientHeight === 0) return;

    op.patch.cg = cgl;

    if (hdpi.get())op.patch.cgl.pixelDensity = window.devicePixelRatio;

    const startTime = performance.now();

    op.patch.config.fpsLimit = getFpsLimit();

    if (cgl.canvasWidth == -1)
    {
        cgl.setCanvas(op.patch.config.glCanvasId);
        return;
    }

    if (cgl.canvasWidth != width.get() || cgl.canvasHeight != height.get())
    {
        let div = 1;
        if (inUnit.get() == "CSS")div = op.patch.cgl.pixelDensity;

        width.set(cgl.canvasWidth / div);
        height.set(cgl.canvasHeight / div);
    }

    if (CABLES.now() - rframeStart > 1000)
    {
        CGL.fpsReport = CGL.fpsReport || [];
        if (op.patch.loading.getProgress() >= 1.0 && rframeStart !== 0)CGL.fpsReport.push(rframes);
        rframes = 0;
        rframeStart = CABLES.now();
    }
    CGL.MESH.lastShader = null;
    CGL.MESH.lastMesh = null;

    cgl.renderStart(cgl, identTranslate, identTranslateView);

    if (clear.get())
    {
        cgl.gl.clearColor(0, 0, 0, 1);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
    }

    trigger.trigger();

    if (CGL.MESH.lastMesh)CGL.MESH.lastMesh.unBind();

    if (CGL.Texture.previewTexture)
    {
        if (!CGL.Texture.texturePreviewer) CGL.Texture.texturePreviewer = new CGL.Texture.texturePreview(cgl);
        CGL.Texture.texturePreviewer.render(CGL.Texture.previewTexture);
    }
    cgl.renderEnd(cgl);

    op.patch.cg = null;

    if (clearAlpha.get())
    {
        cgl.gl.clearColor(1, 1, 1, 1);
        cgl.gl.colorMask(false, false, false, true);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT);
        cgl.gl.colorMask(true, true, true, true);
    }

    if (!cgl.frameStore.phong)cgl.frameStore.phong = {};
    rframes++;

    op.patch.cgl.profileData.profileMainloopMs = performance.now() - startTime;
}

function testMultiMainloop()
{
    clearTimeout(timeOutTest);
    timeOutTest = setTimeout(
        () =>
        {
            if (op.patch.getOpsByObjName(op.name).length > 1)
            {
                op.setUiError("multimainloop", "there should only be one mainloop op!");
                if (!addedListener)addedListener = op.patch.addEventListener("onOpDelete", testMultiMainloop);
            }
            else op.setUiError("multimainloop", null, 1);
        }, 500);
}


};

Ops.Gl.MainLoop.prototype = new CABLES.Op();
CABLES.OPS["b0472a1d-db16-4ba6-8787-f300fbdc77bb"]={f:Ops.Gl.MainLoop,objName:"Ops.Gl.MainLoop"};




// **************************************************************
// 
// Ops.Anim.Timer_v2
// 
// **************************************************************

Ops.Anim.Timer_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    inSpeed = op.inValue("Speed", 1),
    playPause = op.inValueBool("Play", true),
    reset = op.inTriggerButton("Reset"),
    inSyncTimeline = op.inValueBool("Sync to timeline", false),
    outTime = op.outNumber("Time");

op.setPortGroup("Controls", [playPause, reset, inSpeed]);

const timer = new CABLES.Timer();
let lastTime = null;
let time = 0;
let syncTimeline = false;

playPause.onChange = setState;
setState();

function setState()
{
    if (playPause.get())
    {
        timer.play();
        op.patch.addOnAnimFrame(op);
    }
    else
    {
        timer.pause();
        op.patch.removeOnAnimFrame(op);
    }
}

reset.onTriggered = doReset;

function doReset()
{
    time = 0;
    lastTime = null;
    timer.setTime(0);
    outTime.set(0);
}

inSyncTimeline.onChange = function ()
{
    syncTimeline = inSyncTimeline.get();
    playPause.setUiAttribs({ "greyout": syncTimeline });
    reset.setUiAttribs({ "greyout": syncTimeline });
};

op.onAnimFrame = function (tt, frameNum, deltaMs)
{
    if (timer.isPlaying())
    {
        if (CABLES.overwriteTime !== undefined)
        {
            outTime.set(CABLES.overwriteTime * inSpeed.get());
        }
        else

        if (syncTimeline)
        {
            outTime.set(tt * inSpeed.get());
        }
        else
        {
            timer.update();

            const timerVal = timer.get();

            if (lastTime === null)
            {
                lastTime = timerVal;
                return;
            }

            const t = Math.abs(timerVal - lastTime);
            lastTime = timerVal;

            time += t * inSpeed.get();
            if (time != time)time = 0;
            outTime.set(time);
        }
    }
};


};

Ops.Anim.Timer_v2.prototype = new CABLES.Op();
CABLES.OPS["aac7f721-208f-411a-adb3-79adae2e471a"]={f:Ops.Anim.Timer_v2,objName:"Ops.Anim.Timer_v2"};




// **************************************************************
// 
// Ops.Array.ArrayPack3
// 
// **************************************************************

Ops.Array.ArrayPack3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const exe = op.inTrigger("Trigger in"),
    inArr1 = op.inArray("Array 1"),
    inArr2 = op.inArray("Array 2"),
    inArr3 = op.inArray("Array 3"),
    exeOut = op.outTrigger("Trigger out"),
    outArr = op.outArray("Array out", 3),
    outNum = op.outNumber("Num Points"),
    outArrayLength = op.outNumber("Array length");

let showingError = false;

let arr = [];
let emptyArray = [];
let needsCalc = true;

exe.onTriggered = update;

inArr1.onChange = inArr2.onChange = inArr3.onChange = calcLater;

function calcLater()
{
    needsCalc = true;
}

function update()
{
    let array1 = inArr1.get();
    let array2 = inArr2.get();
    let array3 = inArr3.get();

    if (!array1 && !array2 && !array3)
    {
        outArr.set(null);
        outNum.set(0);
        return;
    }
    // only update if array has changed
    if (needsCalc)
    {
        let arrlen = 0;

        if (!array1 || !array2 || !array3)
        {
            if (array1) arrlen = array1.length;
            else if (array2) arrlen = array2.length;
            else if (array3) arrlen = array3.length;

            if (emptyArray.length != arrlen)
                for (let i = 0; i < arrlen; i++) emptyArray[i] = 0;

            if (!array1)array1 = emptyArray;
            if (!array2)array2 = emptyArray;
            if (!array3)array3 = emptyArray;
        }

        if ((array1.length !== array2.length) || (array2.length !== array3.length))
        {
            op.setUiError("arraylen", "Arrays do not have the same length !");
            return;
        }
        op.setUiError("arraylen", null);

        arr.length = array1.length;
        for (let i = 0; i < array1.length; i++)
        {
            arr[i * 3 + 0] = array1[i];
            arr[i * 3 + 1] = array2[i];
            arr[i * 3 + 2] = array3[i];
        }

        needsCalc = false;
        outArr.setRef(arr);
        outNum.set(arr.length / 3);
        outArrayLength.set(arr.length);
    }

    exeOut.trigger();
}


};

Ops.Array.ArrayPack3.prototype = new CABLES.Op();
CABLES.OPS["2bcf32fe-3cbd-48fd-825a-61255bebda9b"]={f:Ops.Array.ArrayPack3,objName:"Ops.Array.ArrayPack3"};




// **************************************************************
// 
// Ops.Array.ArraySin
// 
// **************************************************************

Ops.Array.ArraySin = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
// this op allows the user to perform sin or cos
// math functions on an array
const inArray = op.inArray("array in");
const mathSelect = op.inValueSelect("Math function", ["Sin", "Cos"], "Sin");
const outArray = op.outArray("Array result");

const phase = op.inValue("Phase", 0.0);
const multiply = op.inValue("Frequency", 1.0);
const amplitude = op.inValue("Amplitude", 1.0);

const mathArray = [];
let selectIndex = 0;

const MATH_FUNC_SIN = 0;
const MATH_FUNC_COS = 1;

inArray.onChange = update;
multiply.onChange = update;
amplitude.onChange = update;
phase.onChange = update;
mathSelect.onChange = onFilterChange;

function onFilterChange()
{
    const mathSelectValue = mathSelect.get();
    if (mathSelectValue === "Sin") selectIndex = MATH_FUNC_SIN;
    else if (mathSelectValue === "Cos") selectIndex = MATH_FUNC_COS;
    update();
}

function update()
{
    const arrayIn = inArray.get();

    if (!arrayIn)
    {
        mathArray.length = 0;
        return;
    }

    mathArray.length = arrayIn.length;

    const amp = amplitude.get();
    const mul = multiply.get();
    const pha = phase.get();

    let i = 0;
    if (selectIndex === MATH_FUNC_SIN)
    {
        for (i = 0; i < arrayIn.length; i++)
            mathArray[i] = amp * Math.sin((arrayIn[i]) * mul + pha);
    }
    else if (selectIndex === MATH_FUNC_COS)
    {
        for (i = 0; i < arrayIn.length; i++)
            mathArray[i] = amp * (Math.cos(arrayIn[i] * mul + pha));
    }
    // outArray.set(null);
    outArray.setRef(mathArray);
}


};

Ops.Array.ArraySin.prototype = new CABLES.Op();
CABLES.OPS["ded44bae-a24e-48c5-9585-4cb31f331ab6"]={f:Ops.Array.ArraySin,objName:"Ops.Array.ArraySin"};




// **************************************************************
// 
// Ops.Gl.FontMSDF_v2
// 
// **************************************************************

Ops.Gl.FontMSDF_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    inUUID = op.inString("Font Name", CABLES.uuid()),
    urlData = op.inUrl("Font Data", "/assets/library/fonts_msdf/worksans-regular_int.json"),
    urlTex = op.inUrl("Font Image", "/assets/library/fonts_msdf/worksans-regular_int.png"),
    urlTex1 = op.inUrl("Font Image 1"),
    urlTex2 = op.inUrl("Font Image 2"),
    urlTex3 = op.inUrl("Font Image 3"),
    outLoaded = op.outBool("Loaded"),
    outNumChars = op.outNumber("Total Chars"),
    outChars = op.outString("Chars"),
    cgl = op.patch.cgl;

let
    loadedData = false,
    loadedTex = false,
    loadingId = 0;

inUUID.onChange =
urlData.onChange =
    urlTex.onChange =
    urlTex1.onChange =
    urlTex2.onChange =
    urlTex3.onChange = load;

const textures = [];

function updateLoaded()
{
    const l = loadedData && loadedTex;
    if (!outLoaded.get() && l) op.patch.emitEvent("FontLoadedMSDF");
    outLoaded.set(l);
}

op.onFileChanged = function (fn)
{
    if (
        (urlTex.get() && urlTex.get().indexOf(fn) > -1) ||
        (urlTex1.get() && urlTex1.get().indexOf(fn) > -1) ||
        (urlTex2.get() && urlTex2.get().indexOf(fn) > -1) ||
        (urlTex3.get() && urlTex3.get().indexOf(fn) > -1))
    {
        load();
    }
};

let oldUUID = "";

function load()
{
    if (!urlData.get() || !urlTex.get()) return;

    textures.length = 0;
    op.patch.deleteVar("font_data_" + oldUUID);
    op.patch.deleteVar("font_tex_" + oldUUID);
    oldUUID = inUUID.get();

    const varNameData = "font_data_" + inUUID.get();
    const varNameTex = "font_tex_" + inUUID.get();

    op.patch.setVarValue(varNameData, {});
    op.patch.setVarValue(varNameTex, textures);

    op.patch.getVar(varNameData).type = "fontData";
    op.patch.getVar(varNameTex).type = "fontTexture";

    loadedData = loadedTex = false;
    updateLoaded();

    op.patch.loading.finished(loadingId);
    loadingId = op.patch.loading.start("jsonFile", "" + urlData.get(), op);

    op.setUiError("invaliddata", null);
    op.setUiError("jsonerr", null);
    op.setUiError("texurlerror", null);

    const urlDatastr = op.patch.getFilePath(String(urlData.get()));

    // load font data json
    cgl.patch.loading.addAssetLoadingTask(() =>
    {
        CABLES.ajax(urlDatastr, (err, _data, xhr) =>
        {
            if (err)
            {
                op.logError(err);
                return;
            }
            try
            {
                let data = _data;
                if (typeof data === "string") data = JSON.parse(_data);
                if (!data.chars || !data.info || !data.info.face)
                {
                    op.setUiError("invaliddata", "data file is invalid");
                    return;
                }

                outNumChars.set(data.chars.length);
                let allChars = "";
                for (let i = 0; i < data.chars.length; i++)allChars += data.chars[i].char;
                outChars.set(allChars);

                op.setUiAttrib({ "extendTitle": data.info.face });
                op.patch.setVarValue(varNameData, null);
                op.patch.setVarValue(varNameData,
                    {
                        "name": CABLES.basename(urlData.get()),
                        "basename": inUUID.get(),
                        "data": data
                    });

                op.patch.loading.finished(loadingId);
                loadedData = true;
                updateLoaded();
            }
            catch (e)
            {
                op.patch.setVarValue(varNameData, null);
                op.patch.setVarValue(varNameTex, null);

                op.logError(e);
                op.setUiError("jsonerr", "Problem while loading json:<br/>" + e);
                op.patch.loading.finished(loadingId);
                updateLoaded();
                outLoaded.set(false);
            }
        });
    });

    // load font texture

    for (let i = 0; i < 4; i++)
    {
        const num = i;

        let texPort = urlTex;
        if (i == 1)texPort = urlTex1;
        if (i == 2)texPort = urlTex2;
        if (i == 3)texPort = urlTex3;

        if (!texPort.get()) continue;

        const loadingIdTex = cgl.patch.loading.start(op.objName, texPort.get(), op);
        const urlTexstr = op.patch.getFilePath(String(texPort.get()));

        CGL.Texture.load(cgl, urlTexstr, function (err, tex)
        {
            if (err)
            {
                op.setUiError("texurlerror", "could not load texture");
                cgl.patch.loading.finished(loadingIdTex);
                loadedTex = false;
                return;
            }
            textures[num] = tex;
            op.patch.setVarValue(varNameTex, null);
            op.patch.setVarValue(varNameTex, textures);

            loadedTex = true;
            cgl.patch.loading.finished(loadingIdTex);
            updateLoaded();
        }, {
            "filter": CGL.Texture.FILTER_LINEAR,
            "flip": false
        });
    }
}


};

Ops.Gl.FontMSDF_v2.prototype = new CABLES.Op();
CABLES.OPS["6cbd5d67-25d5-4936-a2ad-3ee8ed478570"]={f:Ops.Gl.FontMSDF_v2,objName:"Ops.Gl.FontMSDF_v2"};




// **************************************************************
// 
// Ops.Gl.TextMeshMSDF_v2
// 
// **************************************************************

Ops.Gl.TextMeshMSDF_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"textmeshsdf_frag":"\nUNI sampler2D tex0;\nUNI sampler2D tex1;\nUNI sampler2D tex2;\nUNI sampler2D tex3;\n\nIN vec2 texCoord;\nIN vec4 fragAttrColors;\n\nUNI vec4 color;\nUNI vec2 texSize;\n\n#ifdef BORDER\n    UNI float borderWidth;\n    UNI float borderSmooth;\n    UNI vec3 colorBorder;\n#endif\n\n#ifdef TEXTURE_COLOR\nUNI sampler2D texMulColor;\n#endif\n#ifdef TEXTURE_MASK\nUNI sampler2D texMulMask;\n#endif\n\nUNI float smoothing;\nIN float texIndex;\n\n#ifdef SHADOW\n    UNI float shadowWidth;\n#endif\n\n\nfloat median(float r, float g, float b)\n{\n    return max(min(r, g), min(max(r, g), b));\n}\n\nvoid main()\n{\n    vec4 bgColor=vec4(0.0,0.0,0.0,0.0);\n    vec4 fgColor=color;\n    float opacity=1.0;\n\n    #ifndef SDF\n        if(int(texIndex)==0) outColor = texture(tex0, texCoord);\n        if(int(texIndex)==1) outColor = texture(tex1, texCoord);\n        if(int(texIndex)==2) outColor = texture(tex2, texCoord);\n        if(int(texIndex)==3) outColor = texture(tex3, texCoord);\n\n        return;\n    #endif\n\n\n    #ifdef TEXTURE_COLOR\n        fgColor.rgb *= texture(texMulColor, vec2(0.0,0.0)).rgb; //todo texcoords from char positioning\n    #endif\n    #ifdef TEXTURE_MASK\n        opacity *= texture(texMulMask, vec2(0.0,0.0)).r; //todo texcoords from char positioning\n    #endif\n\n\n    #ifdef SHADOW\n        vec2 msdfUnit1 = texSize;\n        vec2 tcv=vec2(texCoord.x-0.002,texCoord.y-0.002);\n        vec3 smpl1;\n        if(int(texIndex)==0) smpl1 = texture(tex0, tcv).rgb;\n        if(int(texIndex)==1) smpl1 = texture(tex1, tcv).rgb;\n        if(int(texIndex)==2) smpl1 = texture(tex2, tcv).rgb;\n        if(int(texIndex)==3) smpl1 = texture(tex3, tcv).rgb;\n\n        float sigDist1 = median(smpl1.r, smpl1.g, smpl1.b) - 0.001;\n        float opacity1 = smoothstep(0.0,0.9,sigDist1*sigDist1);\n        outColor = mix(bgColor, vec4(0.0,0.0,0.0,1.0), opacity1);\n    #endif\n\n    vec2 msdfUnit = 8.0/texSize;\n    vec3 smpl;\n\n    if(int(texIndex)==0) smpl = texture(tex0, texCoord).rgb;\n    if(int(texIndex)==1) smpl = texture(tex1, texCoord).rgb;\n    if(int(texIndex)==2) smpl = texture(tex2, texCoord).rgb;\n    if(int(texIndex)==3) smpl = texture(tex3, texCoord).rgb;\n\n\n    float sigDist = median(smpl.r, smpl.g, smpl.b) - 0.5;\n    sigDist *= dot(msdfUnit, (0.5+(smoothing-0.5))/fwidth(texCoord));\n    opacity *= clamp(sigDist + 0.5, 0.0, 1.0);\n\n    #ifdef BORDER\n        float sigDist2 = median(smpl.r, smpl.g, smpl.b) - 0.01;\n        float bw=borderWidth*0.6+0.24;\n        float opacity2 = smoothstep(bw-borderSmooth,bw+borderSmooth,sigDist2*sigDist2);\n        fgColor=mix(fgColor,vec4(colorBorder,1.0),1.0-opacity2);\n    #endif\n\n    if(color.a==0.0)discard;\n\n    outColor = mix(outColor, fgColor, opacity*color.a);\n\n#ifdef HAS_ATTR_COLORS\n    outColor*=fragAttrColors;\n#endif\n}\n\n","textmeshsdf_vert":"UNI sampler2D tex1;\nUNI sampler2D tex2;\nUNI sampler2D tex3;\nUNI sampler2D tex4;\n\nUNI mat4 projMatrix;\nUNI mat4 modelMatrix;\nUNI mat4 viewMatrix;\n\nIN vec3 vPosition;\nIN vec2 attrTexCoord;\nIN mat4 instMat;\nIN vec2 attrTexOffsets;\nIN vec2 attrSize;\nIN vec2 attrTcSize;\nIN float attrPage;\nIN vec4 attrColors;\n\nOUT vec2 texCoord;\nOUT float texIndex;\nOUT vec4 fragAttrColors;\n\n\n\n\nconst float mulSize=0.01;\n\nvoid main()\n{\n    texCoord=(attrTexOffsets+attrTexCoord*attrTcSize);\n    texCoord.y=1.0-texCoord.y;\n\n    mat4 instMVMat=instMat;\n    vec4 vert=vec4( vPosition, 1. );\n    vert.x*=attrSize.x*mulSize;\n    vert.y*=attrSize.y*mulSize;\n\n    fragAttrColors=attrColors;\n\n    texIndex=attrPage+0.4; // strange ios rounding errors?!\n\n    mat4 mvMatrix=viewMatrix * modelMatrix * instMVMat;\n\n    gl_Position = projMatrix * mvMatrix * vert;\n}\n",};
// https://soimy.github.io/msdf-bmfont-xml/

// antialiasing:
// https://github.com/Chlumsky/msdfgen/issues/22

const
    render = op.inTrigger("Render"),
    str = op.inString("Text", "cables"),
    inFont = op.inDropDown("Font", [], "", true),
    scale = op.inFloat("Scale", 0.25),

    letterSpace = op.inFloat("Letter Spacing", 0),
    lineHeight = op.inFloat("Line Height", 1),

    align = op.inSwitch("Align", ["Left", "Center", "Right"], "Center"),
    valign = op.inSwitch("Vertical Align", ["Zero", "Top", "Middle", "Bottom"], "Middle"),

    r = op.inValueSlider("r", 1),
    g = op.inValueSlider("g", 1),
    b = op.inValueSlider("b", 1),
    a = op.inValueSlider("a", 1),
    doSDF = op.inBool("SDF", true),

    smoothing = op.inValueSlider("Smoothing", 0.3),

    inBorder = op.inBool("Border", false),
    inBorderWidth = op.inFloatSlider("Border Width", 0.5),
    inBorderSmooth = op.inFloatSlider("Smoothness", 0.25),
    br = op.inValueSlider("Border r", 1),
    bg = op.inValueSlider("Border g", 1),
    bb = op.inValueSlider("Border b", 1),

    inShadow = op.inBool("Shadow", false),

    inTexColor = op.inTexture("Texture Color"),
    inTexMask = op.inTexture("Texture Mask"),

    inPosArr = op.inArray("Positions"),
    inScaleArr = op.inArray("Scalings"),
    inRotArr = op.inArray("Rotations"),
    inColors = op.inArray("Colors"),

    next = op.outTrigger("Next"),
    outArr = op.outArray("Positions Original", null, 3),

    outScales = op.outArray("Scales", null, 2),
    outLines = op.outNumber("Num Lines"),

    outWidth = op.outNumber("Width"),
    outHeight = op.outNumber("Height"),
    outStartY = op.outNumber("Start Y"),
    outNumChars = op.outNumber("Num Chars");

op.setPortGroup("Size", [letterSpace, lineHeight, scale]);
op.setPortGroup("Character Transformations", [inScaleArr, inRotArr, inPosArr]);
op.setPortGroup("Alignment", [align, valign]);
op.setPortGroup("Color", [r, g, b, a, doSDF]);
op.setPortGroup("Border", [br, bg, bb, inBorderSmooth, inBorderWidth, inBorder]);

r.setUiAttribs({ "colorPick": true });
br.setUiAttribs({ "colorPick": true });

const cgl = op.patch.cgl;
const fontDataVarPrefix = "font_data_";
const substrLength = fontDataVarPrefix.length;
const alignVec = vec3.create();
const vScale = vec3.create();
const shader = new CGL.Shader(cgl, "TextMeshSDF");

let fontTexs = null;
let fontData = null;
let fontChars = null;
let needUpdate = true;
let geom = null;
let mesh = null;
let disabled = false;
let valignMode = 1;
let heightAll = 0, widthAll = 0;
let avgHeight = 0;
let minY, maxY, minX, maxX;
let needsUpdateTransmats = true;
let transMats = null;
let offY = 0;

if (cgl.glVersion == 1)
{
    cgl.gl.getExtension("OES_standard_derivatives");
    shader.enableExtension("GL_OES_standard_derivatives");
}

shader.setSource(attachments.textmeshsdf_vert, attachments.textmeshsdf_frag);

const
    uniTex = new CGL.Uniform(shader, "t", "tex0", 0),
    uniTex1 = new CGL.Uniform(shader, "t", "tex1", 1),
    uniTex2 = new CGL.Uniform(shader, "t", "tex2", 2),
    uniTex3 = new CGL.Uniform(shader, "t", "tex3", 3),
    uniTexMul = new CGL.Uniform(shader, "t", "texMulColor", 4),
    uniTexMulMask = new CGL.Uniform(shader, "t", "texMulMask", 5),
    uniColor = new CGL.Uniform(shader, "4f", "color", r, g, b, a),
    uniColorBorder = new CGL.Uniform(shader, "3f", "colorBorder", br, bg, bb),

    uniTexSize = new CGL.Uniform(shader, "2f", "texSize", 0, 0),

    uniSmoothing = new CGL.Uniform(shader, "f", "smoothing", smoothing),
    uniborderSmooth = new CGL.Uniform(shader, "f", "borderSmooth", inBorderSmooth),
    uniborderWidth = new CGL.Uniform(shader, "f", "borderWidth", inBorderWidth);

scale.onChange = updateScale;

inRotArr.onChange =
    inPosArr.onChange =
    inScaleArr.onChange = function () { needsUpdateTransmats = true; };

inTexColor.onChange =
inTexMask.onChange =
inShadow.onChange =
inBorder.onChange =
doSDF.onChange =
    updateDefines;

inColors.onLinkChanged = () =>
{
    updateDefines();
    needsUpdateTransmats = true;
    needUpdate = true;
};

inColors.onChange = () =>
{
    needUpdate = true;
    if (mesh && inColors.get() && inColors.isLinked())
        mesh.setAttribute("attrColors", new Float32Array(inColors.get()), 4, { "instanced": true });
};

align.onChange =
    str.onChange =
    letterSpace.onChange =
    lineHeight.onChange =
    function ()
    {
        needUpdate = true;
    };

valign.onChange = updateAlign;

op.patch.addEventListener("variablesChanged", updateFontList);
op.patch.addEventListener("FontLoadedMSDF", updateFontList);

inFont.onChange = updateFontData;

updateDefines();
updateScale();
updateFontList();

function updateDefines()
{
    shader.toggleDefine("SDF", doSDF.get());
    shader.toggleDefine("SHADOW", inShadow.get());
    shader.toggleDefine("BORDER", inBorder.get());
    shader.toggleDefine("TEXTURE_COLOR", inTexColor.isLinked());
    shader.toggleDefine("TEXTURE_MASK", inTexMask.isLinked());
    shader.toggleDefine("HAS_ATTR_COLORS", inColors.isLinked());

    br.setUiAttribs({ "greyout": !inBorder.get() });
    bg.setUiAttribs({ "greyout": !inBorder.get() });
    bb.setUiAttribs({ "greyout": !inBorder.get() });
    inBorderSmooth.setUiAttribs({ "greyout": !inBorder.get() });
    inBorderWidth.setUiAttribs({ "greyout": !inBorder.get() });
}

function updateFontData()
{
    updateFontList();
    const varname = fontDataVarPrefix + inFont.get();

    fontData = null;
    fontTexs = null;
    fontChars = {};

    const dataVar = op.patch.getVar(varname);

    if (!dataVar || !dataVar.getValue())
    {
        fontData = null;

        op.warn("no varname", varname);
        return;
    }

    fontData = dataVar.getValue().data;

    if (!fontData)
    {
        return;
    }

    const basename = dataVar.getValue().basename;

    const textVar = op.patch.getVar("font_tex_" + basename);
    if (!textVar)
    {
        fontTexs = null;
        fontData = null;
        return;
    }

    fontTexs = textVar.getValue();

    for (let i = 0; i < fontData.chars.length; i++) fontChars[fontData.chars[i].char] = fontData.chars[i];
    needUpdate = true;
}

function updateFontList()
{
    const vars = op.patch.getVars();
    const names = ["..."];

    for (const i in vars)
        if (vars[i].type == "fontData")
            names.push(i.substr(substrLength));

    inFont.uiAttribs.values = names;
}

function updateScale()
{
    const s = scale.get();
    vec3.set(vScale, s, s, s);
    vec3.set(alignVec, 0, offY * s, 0);

    outWidth.set(widthAll * s);
    outHeight.set(heightAll * s);

    outStartY.set((maxY + offY) * s);
}

function updateAlign()
{
    if (minX == undefined) return;
    if (valign.get() == "Top") valignMode = 0;
    else if (valign.get() == "Middle") valignMode = 1;
    else if (valign.get() == "Bottom") valignMode = 2;
    else if (valign.get() == "Zero") valignMode = 3;

    offY = 0;
    widthAll = (Math.abs(minX - maxX));
    heightAll = (Math.abs(minY - maxY));

    if (valignMode === 1) offY = heightAll / 2;
    else if (valignMode === 2) offY = heightAll;

    if (valignMode != 0)offY -= avgHeight;

    updateScale();
}

function buildTransMats()
{
    needsUpdateTransmats = false;

    // if(!( inPosArr.get() || inScaleArr.get() || inRotArr.get()))
    // {
    //     transMats=null;
    //     return;
    // }

    const transformations = [];
    const translates = inPosArr.get() || outArr.get();
    const scales = inScaleArr.get();
    const rots = inRotArr.get();

    for (let i = 0; i < mesh.numInstances; i++)
    {
        const m = mat4.create();
        mat4.translate(m, m, [translates[i * 3 + 0], translates[i * 3 + 1], translates[i * 3 + 2]]);

        if (scales) mat4.scale(m, m, [scales[i * 3 + 0], scales[i * 3 + 1], scales[i * 3 + 2]]);

        if (rots)
        {
            mat4.rotateX(m, m, rots[i * 3 + 0] * CGL.DEG2RAD);
            mat4.rotateY(m, m, rots[i * 3 + 1] * CGL.DEG2RAD);
            mat4.rotateZ(m, m, rots[i * 3 + 2] * CGL.DEG2RAD);
        }

        transformations.push(Array.prototype.slice.call(m));
    }

    transMats = [].concat.apply([], transformations);
}

render.onTriggered = function ()
{
    if (!fontData)
    {
        op.setUiError("nodata", "No font data!");
        op.setUiError("msdfhint", "Use the FontMSDF op to create font and texture.", 0);
        updateFontData();
        next.trigger();
        return;
    }
    if (!fontTexs)
    {
        op.setUiError("nodata", "No font texture");
        op.setUiError("msdfhint", "Use the FontMSDF op to create font and texture.", 0);
        updateFontData();
        next.trigger();
        return;
    }

    op.setUiError("nodata", null);
    op.setUiError("msdfhint", null);

    if (needUpdate)
    {
        generateMesh();
        needUpdate = false;
    }

    if (mesh && mesh.numInstances > 0)
    {
        // cgl.pushBlendMode(CGL.BLEND_NORMAL, true);
        cgl.pushShader(shader);

        if (fontTexs[0]) uniTexSize.setValue([fontTexs[0].width, fontTexs[0].height]);

        if (fontTexs[0]) cgl.setTexture(0, fontTexs[0].tex);
        else cgl.setTexture(0, CGL.Texture.getEmptyTexture(cgl).tex);

        if (fontTexs[1])cgl.setTexture(1, fontTexs[1].tex);
        else cgl.setTexture(1, CGL.Texture.getEmptyTexture(cgl).tex);

        if (fontTexs[2])cgl.setTexture(2, fontTexs[2].tex);
        else cgl.setTexture(2, CGL.Texture.getEmptyTexture(cgl).tex);

        if (fontTexs[3])cgl.setTexture(3, fontTexs[3].tex);
        else cgl.setTexture(3, CGL.Texture.getEmptyTexture(cgl).tex);

        if (inTexColor.get()) cgl.setTexture(4, inTexColor.get().tex);
        if (inTexMask.get()) cgl.setTexture(5, inTexMask.get().tex);

        cgl.pushModelMatrix();
        mat4.translate(cgl.mMatrix, cgl.mMatrix, alignVec);

        if (needsUpdateTransmats) buildTransMats();
        if (transMats) mesh.setAttribute("instMat", new Float32Array(transMats), 16, { "instanced": true });
        if (cgl.getShader())cgl.getShader().define("INSTANCING");

        if (!disabled)
        {
            mat4.scale(cgl.mMatrix, cgl.mMatrix, vScale);

            mesh.render(cgl.getShader());
        }

        cgl.popModelMatrix();

        cgl.setTexture(0, null);
        cgl.popShader();
        // cgl.popBlendMode();
    }

    next.trigger();
};

function getChar(chStr)
{
    return fontChars[String(chStr)] || fontChars["?"] || fontChars._ || fontChars.X;
}

function generateMesh()
{
    if (!fontData || !fontChars)
    {
        outNumChars.set(0);
        return;
    }

    const theString = String(str.get() + "");

    if (!geom)
    {
        geom = new CGL.Geometry("textmesh");

        geom.vertices = [
            0.5, 0.5, 0.0,
            -0.5, 0.5, 0.0,
            0.5, -0.5, 0.0,
            -0.5, -0.5, 0.0
        ];

        geom.normals = [
            0.0, 0.0, 0.0,
            0.0, 0.0, 0.0,
            0.0, 0.0, 0.0,
            0.0, 0.0, 0.0
        ];

        geom.texCoords = new Float32Array([
            1.0, 0.0,
            0.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ]);

        geom.verticesIndices = [
            0, 1, 2,
            2, 1, 3
        ];
    }

    if (mesh)mesh.dispose();
    mesh = new CGL.Mesh(cgl, geom);

    const strings = (theString).split("\n");
    const transformations = [];
    const tcOffsets = [];
    const sizes = [];
    const texPos = [];
    const tcSizes = [];
    const pages = [];
    let charCounter = 0;
    const arrPositions = [];

    const mulSize = 0.01;

    outLines.set(strings.length);
    minY = 99999;
    maxY = -99999;
    minX = 99999;
    maxX = -99999;

    avgHeight = 0;

    for (let i = 0; i < fontData.chars.length; i++)
    {
        if (fontData.chars[i].height) avgHeight += fontData.chars[i].height;
    }
    avgHeight /= fontData.chars.length;
    avgHeight *= mulSize;

    for (let s = 0; s < strings.length; s++)
    {
        const txt = strings[s];
        const numChars = txt.length;
        let lineWidth = 0;

        for (let i = 0; i < numChars; i++)
        {
            const chStr = txt.substring(i, i + 1);
            const char = getChar(chStr);
            if (char) lineWidth += char.xadvance * mulSize + letterSpace.get();
        }

        let pos = 0;
        if (align.get() == "Right") pos -= lineWidth;
        else if (align.get() == "Center") pos -= lineWidth / 2;

        for (let i = 0; i < numChars; i++)
        {
            const m = mat4.create();

            const chStr = txt.substring(i, i + 1);
            const char = getChar(chStr);

            if (!char) continue;

            pages.push(char.page || 0);
            sizes.push(char.width, char.height);

            tcOffsets.push(char.x / fontData.common.scaleW, (char.y / fontData.common.scaleH));

            const charWidth = char.width / fontData.common.scaleW;
            const charHeight = char.height / fontData.common.scaleH;
            const charOffsetY = (char.yoffset / fontData.common.scaleH);
            const charOffsetX = char.xoffset / fontData.common.scaleW;

            if (chStr == " ") tcSizes.push(0, 0);
            else tcSizes.push(charWidth, charHeight);

            mat4.identity(m);

            let adv = (char.xadvance / 2) * mulSize;
            pos += adv;

            const x = pos + (char.xoffset / 2) * mulSize;
            const y = (s * -lineHeight.get()) + (avgHeight) - (mulSize * (char.yoffset + char.height / 2));

            minX = Math.min(x - charWidth, minX);
            maxX = Math.max(x + charWidth, maxX);
            minY = Math.min(y - charHeight - avgHeight / 2, minY);
            maxY = Math.max(y + charHeight + avgHeight / 2, maxY);

            mat4.translate(m, m, [x, y, 0]);
            arrPositions.push(x, y, 0);

            adv = (char.xadvance / 2) * mulSize + letterSpace.get();

            pos += adv;

            minX = Math.min(pos - charWidth, minX);
            maxX = Math.max(pos + charWidth, maxX);

            transformations.push(Array.prototype.slice.call(m));

            charCounter++;
        }
    }

    transMats = [].concat.apply([], transformations);

    disabled = false;
    if (transMats.length == 0) disabled = true;

    mesh.numInstances = transMats.length / 16;
    outNumChars.set(mesh.numInstances);

    if (mesh.numInstances == 0)
    {
        disabled = true;
        return;
    }

    mesh.setAttribute("instMat", new Float32Array(transMats), 16, { "instanced": true });
    mesh.setAttribute("attrTexOffsets", new Float32Array(tcOffsets), 2, { "instanced": true });
    mesh.setAttribute("attrTcSize", new Float32Array(tcSizes), 2, { "instanced": true });
    mesh.setAttribute("attrSize", new Float32Array(sizes), 2, { "instanced": true });
    mesh.setAttribute("attrPage", new Float32Array(pages), 1, { "instanced": true });

    if (inColors.isLinked())
        mesh.setAttribute("attrColors", new Float32Array(inColors.get()), 4, { "instanced": true });

    outScales.set(sizes);
    updateAlign();
    needsUpdateTransmats = true;
    outArr.setRef(arrPositions);
}


};

Ops.Gl.TextMeshMSDF_v2.prototype = new CABLES.Op();
CABLES.OPS["b5c99363-a749-4040-884b-66f91294bcad"]={f:Ops.Gl.TextMeshMSDF_v2,objName:"Ops.Gl.TextMeshMSDF_v2"};




// **************************************************************
// 
// Ops.Gl.ClearColor
// 
// **************************************************************

Ops.Gl.ClearColor = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    trigger = op.outTrigger("trigger"),
    r = op.inFloatSlider("r", 0.1),
    g = op.inFloatSlider("g", 0.1),
    b = op.inFloatSlider("b", 0.1),
    a = op.inFloatSlider("a", 1);

r.setUiAttribs({ "colorPick": true });

const cgl = op.patch.cgl;

render.onTriggered = function ()
{
    cgl.gl.clearColor(r.get(), g.get(), b.get(), a.get());
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
    trigger.trigger();
};


};

Ops.Gl.ClearColor.prototype = new CABLES.Op();
CABLES.OPS["19b441eb-9f63-4f35-ba08-b87841517c4d"]={f:Ops.Gl.ClearColor,objName:"Ops.Gl.ClearColor"};




// **************************************************************
// 
// Ops.Gl.Matrix.OrbitControls
// 
// **************************************************************

Ops.Gl.Matrix.OrbitControls = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    minDist = op.inValueFloat("min distance"),
    maxDist = op.inValueFloat("max distance"),

    minRotY = op.inValue("min rot y", 0),
    maxRotY = op.inValue("max rot y", 0),

    initialRadius = op.inValue("initial radius", 0),
    initialAxis = op.inValueSlider("initial axis y"),
    initialX = op.inValueSlider("initial axis x"),

    mul = op.inValueFloat("mul"),
    smoothness = op.inValueSlider("Smoothness", 1.0),
    speedX = op.inValue("Speed X", 1),
    speedY = op.inValue("Speed Y", 1),

    active = op.inValueBool("Active", true),

    allowPanning = op.inValueBool("Allow Panning", true),
    allowZooming = op.inValueBool("Allow Zooming", true),
    allowRotation = op.inValueBool("Allow Rotation", true),
    restricted = op.inValueBool("restricted", true),

    trigger = op.outTrigger("trigger"),
    outRadius = op.outNumber("radius"),
    outXDeg = op.outNumber("Rot X"),
    outYDeg = op.outNumber("Rot Y"),

    inReset = op.inTriggerButton("Reset");

op.setPortGroup("Initial Values", [initialAxis, initialX, initialRadius]);
op.setPortGroup("Interaction", [mul, smoothness, speedX, speedY]);
op.setPortGroup("Boundaries", [minRotY, maxRotY, minDist, maxDist]);

mul.set(1);
minDist.set(0.01);
maxDist.set(99999);

inReset.onTriggered = reset;

let eye = vec3.create();
const vUp = vec3.create();
const vCenter = vec3.create();
const viewMatrix = mat4.create();
const tempViewMatrix = mat4.create();
const vOffset = vec3.create();
const finalEyeAbs = vec3.create();

initialAxis.set(0.5);

let mouseDown = false;
let radius = 5;
outRadius.set(radius);

let lastMouseX = 0, lastMouseY = 0;
let percX = 0, percY = 0;

vec3.set(vCenter, 0, 0, 0);
vec3.set(vUp, 0, 1, 0);

const tempEye = vec3.create();
const finalEye = vec3.create();
const tempCenter = vec3.create();
const finalCenter = vec3.create();

let px = 0;
let py = 0;

let divisor = 1;
let element = null;
updateSmoothness();

op.onDelete = unbind;

const halfCircle = Math.PI;
const fullCircle = Math.PI * 2;

function reset()
{
    let off = 0;

    if (px % fullCircle < -halfCircle)
    {
        off = -fullCircle;
        px %= -fullCircle;
    }
    else
    if (px % fullCircle > halfCircle)
    {
        off = fullCircle;
        px %= fullCircle;
    }
    else px %= fullCircle;

    py %= (Math.PI);

    vec3.set(vOffset, 0, 0, 0);
    vec3.set(vCenter, 0, 0, 0);
    vec3.set(vUp, 0, 1, 0);

    percX = (initialX.get() * Math.PI * 2 + off);
    percY = (initialAxis.get() - 0.5);

    radius = initialRadius.get();
    eye = circlePos(percY);
}

function updateSmoothness()
{
    divisor = smoothness.get() * 10 + 1.0;
}

smoothness.onChange = updateSmoothness;

let initializing = true;

function ip(val, goal)
{
    if (initializing) return goal;
    return val + (goal - val) / divisor;
}

let lastPy = 0;
const lastPx = 0;

render.onTriggered = function ()
{
    const cgl = op.patch.cg;
    if (!cgl) return;

    if (!element)
    {
        setElement(cgl.canvas);
        bind();
    }

    cgl.pushViewMatrix();

    px = ip(px, percX);
    py = ip(py, percY);

    let degY = (py + 0.5) * 180;

    if (minRotY.get() !== 0 && degY < minRotY.get())
    {
        degY = minRotY.get();
        py = lastPy;
    }
    else if (maxRotY.get() !== 0 && degY > maxRotY.get())
    {
        degY = maxRotY.get();
        py = lastPy;
    }
    else
    {
        lastPy = py;
    }

    const degX = (px) * CGL.RAD2DEG;

    outYDeg.set(degY);
    outXDeg.set(degX);

    circlePosi(eye, py);

    vec3.add(tempEye, eye, vOffset);
    vec3.add(tempCenter, vCenter, vOffset);

    finalEye[0] = ip(finalEye[0], tempEye[0]);
    finalEye[1] = ip(finalEye[1], tempEye[1]);
    finalEye[2] = ip(finalEye[2], tempEye[2]);

    finalCenter[0] = ip(finalCenter[0], tempCenter[0]);
    finalCenter[1] = ip(finalCenter[1], tempCenter[1]);
    finalCenter[2] = ip(finalCenter[2], tempCenter[2]);

    const empty = vec3.create();

    mat4.lookAt(viewMatrix, finalEye, finalCenter, vUp);
    mat4.rotate(viewMatrix, viewMatrix, px, vUp);

    // finaly multiply current scene viewmatrix
    mat4.multiply(cgl.vMatrix, cgl.vMatrix, viewMatrix);

    trigger.trigger();
    cgl.popViewMatrix();
    initializing = false;
};

function circlePosi(vec, perc)
{
    const mmul = mul.get();
    if (radius < minDist.get() * mmul) radius = minDist.get() * mmul;
    if (radius > maxDist.get() * mmul) radius = maxDist.get() * mmul;

    outRadius.set(radius * mmul);

    let i = 0, degInRad = 0;

    degInRad = 360 * perc / 2 * CGL.DEG2RAD;
    vec3.set(vec,
        Math.cos(degInRad) * radius * mmul,
        Math.sin(degInRad) * radius * mmul,
        0);
    return vec;
}

function circlePos(perc)
{
    const mmul = mul.get();
    if (radius < minDist.get() * mmul)radius = minDist.get() * mmul;
    if (radius > maxDist.get() * mmul)radius = maxDist.get() * mmul;

    outRadius.set(radius * mmul);

    let i = 0, degInRad = 0;
    const vec = vec3.create();
    degInRad = 360 * perc / 2 * CGL.DEG2RAD;
    vec3.set(vec,
        Math.cos(degInRad) * radius * mmul,
        Math.sin(degInRad) * radius * mmul,
        0);
    return vec;
}

function onmousemove(event)
{
    if (!mouseDown) return;

    const x = event.clientX;
    const y = event.clientY;

    let movementX = (x - lastMouseX);
    let movementY = (y - lastMouseY);

    movementX *= speedX.get();
    movementY *= speedY.get();

    if (event.buttons == 2 && allowPanning.get())
    {
        vOffset[2] += movementX * 0.01 * mul.get();
        vOffset[1] += movementY * 0.01 * mul.get();
    }
    else
    if (event.buttons == 4 && allowZooming.get())
    {
        radius += movementY * 0.05;
        eye = circlePos(percY);
    }
    else
    {
        if (allowRotation.get())
        {
            percX += movementX * 0.003;
            percY += movementY * 0.002;

            if (restricted.get())
            {
                if (percY > 0.5)percY = 0.5;
                if (percY < -0.5)percY = -0.5;
            }
        }
    }

    lastMouseX = x;
    lastMouseY = y;
}

function onMouseDown(event)
{
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    mouseDown = true;

    try { element.setPointerCapture(event.pointerId); }
    catch (e) {}
}

function onMouseUp(e)
{
    mouseDown = false;
    // cgl.canvas.style.cursor='url(/ui/img/rotate.png),pointer';

    try { element.releasePointerCapture(e.pointerId); }
    catch (e) {}
}

function lockChange()
{
    const el = op.patch.cg.canvas;

    if (document.pointerLockElement === el || document.mozPointerLockElement === el || document.webkitPointerLockElement === el)
    {
        document.addEventListener("mousemove", onmousemove, false);
    }
}

function onMouseEnter(e)
{
    // cgl.canvas.style.cursor='url(/ui/img/rotate.png),pointer';
}

initialRadius.onChange = function ()
{
    radius = initialRadius.get();
    reset();
};

initialX.onChange = function ()
{
    px = percX = (initialX.get() * Math.PI * 2);
};

initialAxis.onChange = function ()
{
    py = percY = (initialAxis.get() - 0.5);
    eye = circlePos(percY);
};

const onMouseWheel = function (event)
{
    if (allowZooming.get())
    {
        const delta = CGL.getWheelSpeed(event) * 0.06;
        radius += (parseFloat(delta)) * 1.2;

        eye = circlePos(percY);
    }
};

const ontouchstart = function (event)
{
    if (event.touches && event.touches.length > 0) onMouseDown(event.touches[0]);
};

const ontouchend = function (event)
{
    onMouseUp();
};

const ontouchmove = function (event)
{
    if (event.touches && event.touches.length > 0) onmousemove(event.touches[0]);
};

active.onChange = function ()
{
    if (active.get())bind();
    else unbind();
};

function setElement(ele)
{
    unbind();
    element = ele;
    bind();
}

function bind()
{
    if (!element) return;

    element.addEventListener("pointermove", onmousemove);
    element.addEventListener("pointerdown", onMouseDown);
    element.addEventListener("pointerup", onMouseUp);
    element.addEventListener("pointerleave", onMouseUp);
    element.addEventListener("pointerenter", onMouseEnter);
    element.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    element.addEventListener("wheel", onMouseWheel, { "passive": true });
}

function unbind()
{
    if (!element) return;

    element.removeEventListener("pointermove", onmousemove);
    element.removeEventListener("pointerdown", onMouseDown);
    element.removeEventListener("pointerup", onMouseUp);
    element.removeEventListener("pointerleave", onMouseUp);
    element.removeEventListener("pointerenter", onMouseUp);
    element.removeEventListener("wheel", onMouseWheel);
}

eye = circlePos(0);

initialX.set(0.25);
initialRadius.set(0.05);


};

Ops.Gl.Matrix.OrbitControls.prototype = new CABLES.Op();
CABLES.OPS["eaf4f7ce-08a3-4d1b-b9f4-ebc0b7b1cde1"]={f:Ops.Gl.Matrix.OrbitControls,objName:"Ops.Gl.Matrix.OrbitControls"};




// **************************************************************
// 
// Ops.Math.MapRange
// 
// **************************************************************

Ops.Math.MapRange = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    v = op.inValueFloat("value", 0),
    old_min = op.inValueFloat("old min", 0),
    old_max = op.inValueFloat("old max", 1),
    new_min = op.inValueFloat("new min", 0),
    new_max = op.inValueFloat("new max", 1),
    easing = op.inValueSelect("Easing", ["Linear", "Smoothstep", "Smootherstep"], "Linear"),
    inClamp = op.inBool("Clamp", true),
    result = op.outNumber("result", 0);

op.setPortGroup("Input Range", [old_min, old_max]);
op.setPortGroup("Output Range", [new_min, new_max]);

let doClamp = true;
let ease = 0;
let r = 0;

v.onChange =
    old_min.onChange =
    old_max.onChange =
    new_min.onChange =
    new_max.onChange = exec;

exec();

inClamp.onChange =
() =>
{
    doClamp = inClamp.get();
    exec();
};

easing.onChange = function ()
{
    if (easing.get() == "Smoothstep") ease = 1;
    else if (easing.get() == "Smootherstep") ease = 2;
    else ease = 0;
};

function exec()
{
    const nMin = new_min.get();
    const nMax = new_max.get();
    const oMin = old_min.get();
    const oMax = old_max.get();
    let x = v.get();

    if (doClamp)
    {
        if (x >= Math.max(oMax, oMin))
        {
            result.set(nMax);
            return;
        }
        else
        if (x <= Math.min(oMax, oMin))
        {
            result.set(nMin);
            return;
        }
    }

    let reverseInput = false;
    const oldMin = Math.min(oMin, oMax);
    const oldMax = Math.max(oMin, oMax);
    if (oldMin != oMin) reverseInput = true;

    let reverseOutput = false;
    const newMin = Math.min(nMin, nMax);
    const newMax = Math.max(nMin, nMax);
    if (newMin != nMin) reverseOutput = true;

    let portion = 0;

    if (reverseInput) portion = (oldMax - x) * (newMax - newMin) / (oldMax - oldMin);
    else portion = (x - oldMin) * (newMax - newMin) / (oldMax - oldMin);

    if (reverseOutput) r = newMax - portion;
    else r = portion + newMin;

    if (ease === 0)
    {
        result.set(r);
    }
    else
    if (ease == 1)
    {
        x = Math.max(0, Math.min(1, (r - nMin) / (nMax - nMin)));
        result.set(nMin + x * x * (3 - 2 * x) * (nMax - nMin)); // smoothstep
    }
    else
    if (ease == 2)
    {
        x = Math.max(0, Math.min(1, (r - nMin) / (nMax - nMin)));
        result.set(nMin + x * x * x * (x * (x * 6 - 15) + 10) * (nMax - nMin)); // smootherstep
    }
}


};

Ops.Math.MapRange.prototype = new CABLES.Op();
CABLES.OPS["2617b407-60a0-4ff6-b4a7-18136cfa7817"]={f:Ops.Math.MapRange,objName:"Ops.Math.MapRange"};




// **************************************************************
// 
// Ops.Gl.ShaderEffects.DiscardMaterialAlpha
// 
// **************************************************************

Ops.Gl.ShaderEffects.DiscardMaterialAlpha = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"alpha_frag":"\n\n#ifdef ALPHA_THRESHOLD\n    if(col.a<MOD_threshold) discard;\n#endif\n\n#ifdef ALPHA_ONE\n    col.a=1.0;\n#endif\n\n#ifdef ALPHA_DITHERED\n    if ( dither_InterleavedGradientNoise(col.a) <= 0.5 )\n        discard;\n#endif\n\n#ifdef ALPHA_COVERAGE_SHARP\n    // if(col.a<MOD_threshold) discard;\n\n    col.a = (col.a - MOD_threshold) / max(fwidth(col.a), 0.0001) + 0.5;\n#endif","alpha_head_frag":"#ifdef ALPHA_DITHERED\n// from https://github.com/google/filament/blob/main/shaders/src/dithering.fs\n// modified to use this to discard based on factor instead of dithering\nfloat interleavedGradientNoise(highp vec2 n) {\n    return fract(52.982919 * fract(dot(vec2(0.06711, 0.00584), n)));\n}\nfloat dither_InterleavedGradientNoise(float a) {\n    // Jimenez 2014, \"Next Generation Post-Processing in Call of Duty\"\n    highp vec2 uv = gl_FragCoord.xy;\n\n    // The noise variable must be highp to workaround Adreno bug #1096.\n    highp float noise = interleavedGradientNoise(uv);\n\n    return step(noise, a);\n}\n#endif",};
const
    render = op.inTrigger("render"),
    inMeth = op.inSwitch("Method", ["Normal", "Discard", "Coverage", "Cov. Sharp", "Dither", "None"], "Discard"),
    next = op.outTrigger("trigger"),
    inThresh = op.inValueSlider("Threshold", 0.3);

const cgl = op.patch.cgl;
const mod = new CGL.ShaderModifier(cgl, op.name, { "opId": op.id });

let atc = false;

inMeth.onChange = updateDefines;

mod.addModule({
    "title": op.name,
    "name": "MODULE_COLOR",
    "srcHeadFrag": attachments.alpha_head_frag,
    "srcBodyFrag": attachments.alpha_frag
});

mod.addUniformFrag("f", "MOD_threshold", inThresh);

updateDefines();

function updateDefines()
{
    mod.toggleDefine("ALPHA_THRESHOLD", inMeth.get() == "Discard");
    mod.toggleDefine("ALPHA_ONE", inMeth.get() == "None");
    mod.toggleDefine("ALPHA_COVERAGE_SHARP", inMeth.get() == "Cov. Sharp");
    mod.toggleDefine("ALPHA_DITHERED", inMeth.get() == "Dither");

    inThresh.setUiAttribs({ "greyout": !(inMeth.get() == "Discard" || inMeth.get() == "Cov. Sharp") });

    atc = inMeth.get() == "Coverage" || inMeth.get() == "Cov. Sharp";
}

render.onTriggered = function ()
{
    if (atc) cgl.gl.enable(cgl.gl.SAMPLE_ALPHA_TO_COVERAGE);

    mod.bind();
    next.trigger();
    mod.unbind();

    cgl.gl.disable(cgl.gl.SAMPLE_ALPHA_TO_COVERAGE);
};


};

Ops.Gl.ShaderEffects.DiscardMaterialAlpha.prototype = new CABLES.Op();
CABLES.OPS["0cc7f41f-e933-4309-a63a-32a2446a5276"]={f:Ops.Gl.ShaderEffects.DiscardMaterialAlpha,objName:"Ops.Gl.ShaderEffects.DiscardMaterialAlpha"};




// **************************************************************
// 
// Ops.Sidebar.Button_v2
// 
// **************************************************************

Ops.Sidebar.Button_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
// inputs
const parentPort = op.inObject("link");
const buttonTextPort = op.inString("Text", "Button");

// outputs
const siblingsPort = op.outObject("childs");
const buttonPressedPort = op.outTrigger("Pressed Trigger");

const inGreyOut = op.inBool("Grey Out", false);
const inVisible = op.inBool("Visible", true);

// vars
const el = document.createElement("div");
el.dataset.op = op.id;
el.classList.add("cablesEle");
el.classList.add("sidebar__item");
el.classList.add("sidebar--button");
const input = document.createElement("div");
input.classList.add("sidebar__button-input");
el.appendChild(input);
input.addEventListener("click", onButtonClick);
const inputText = document.createTextNode(buttonTextPort.get());
input.appendChild(inputText);
op.toWorkNeedsParent("Ops.Sidebar.Sidebar");

// events
parentPort.onChange = onParentChanged;
buttonTextPort.onChange = onButtonTextChanged;
op.onDelete = onDelete;

const greyOut = document.createElement("div");
greyOut.classList.add("sidebar__greyout");
el.appendChild(greyOut);
greyOut.style.display = "none";

inGreyOut.onChange = function ()
{
    greyOut.style.display = inGreyOut.get() ? "block" : "none";
};

inVisible.onChange = function ()
{
    el.style.display = inVisible.get() ? "block" : "none";
};

function onButtonClick()
{
    buttonPressedPort.trigger();
}

function onButtonTextChanged()
{
    const buttonText = buttonTextPort.get();
    input.textContent = buttonText;
    if (CABLES.UI)
    {
        op.setUiAttrib({ "extendTitle": buttonText });
    }
}

function onParentChanged()
{
    siblingsPort.set(null);
    const parent = parentPort.get();
    if (parent && parent.parentElement)
    {
        parent.parentElement.appendChild(el);
        siblingsPort.set(parent);
    }
    else
    { // detach
        if (el.parentElement)
        {
            el.parentElement.removeChild(el);
        }
    }
}

function showElement(el)
{
    if (el)
    {
        el.style.display = "block";
    }
}

function hideElement(el)
{
    if (el)
    {
        el.style.display = "none";
    }
}

function onDelete()
{
    removeElementFromDOM(el);
}

function removeElementFromDOM(el)
{
    if (el && el.parentNode && el.parentNode.removeChild)
    {
        el.parentNode.removeChild(el);
    }
}


};

Ops.Sidebar.Button_v2.prototype = new CABLES.Op();
CABLES.OPS["5e9c6933-0605-4bf7-8671-a016d917f327"]={f:Ops.Sidebar.Button_v2,objName:"Ops.Sidebar.Button_v2"};




// **************************************************************
// 
// Ops.Sidebar.Sidebar
// 
// **************************************************************

Ops.Sidebar.Sidebar = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"style_css":" /*\n * SIDEBAR\n  http://danielstern.ca/range.css/#/\n  https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-progress-value\n */\n\n.sidebar-icon-undo\n{\n    width:10px;\n    height:10px;\n    background-image: url(\"data:image/svg+xml;charset=utf8, %3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='grey' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 7v6h6'/%3E%3Cpath d='M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13'/%3E%3C/svg%3E\");\n    background-size: 19px;\n    background-repeat: no-repeat;\n    top: -19px;\n    margin-top: -7px;\n}\n\n.icon-chevron-down {\n    top: 2px;\n    right: 9px;\n}\n\n.iconsidebar-chevron-up,.sidebar__close-button {\n\tbackground-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODg4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWNoZXZyb24tdXAiPjxwb2x5bGluZSBwb2ludHM9IjE4IDE1IDEyIDkgNiAxNSI+PC9wb2x5bGluZT48L3N2Zz4=);\n}\n\n.iconsidebar-minimizebutton {\n    background-position: 98% center;\n    background-repeat: no-repeat;\n}\n\n.sidebar-cables-right\n{\n    right: 15px;\n    left: initial !important;\n}\n\n.sidebar-cables *\n{\n    color: #BBBBBB !important;\n    font-family: Arial;\n}\n\n.sidebar-cables {\n    --sidebar-color: #07f78c;\n    --sidebar-width: 220px;\n    --sidebar-border-radius: 10px;\n    --sidebar-monospace-font-stack: \"SFMono-Regular\", Consolas, \"Liberation Mono\", Menlo, Courier, monospace;\n    --sidebar-hover-transition-time: .2s;\n\n    position: absolute;\n    top: 15px;\n    left: 15px;\n    border-radius: var(--sidebar-border-radius);\n    z-index: 100000;\n    width: var(--sidebar-width);\n    max-height: 100%;\n    box-sizing: border-box;\n    overflow-y: auto;\n    overflow-x: hidden;\n    font-size: 13px;\n    line-height: 1em; /* prevent emojis from breaking height of the title */\n}\n\n.sidebar-cables::selection {\n    background-color: var(--sidebar-color);\n    color: #EEEEEE;\n}\n\n.sidebar-cables::-webkit-scrollbar {\n    background-color: transparent;\n    --cables-scrollbar-width: 8px;\n    width: var(--cables-scrollbar-width);\n}\n\n.sidebar-cables::-webkit-scrollbar-track {\n    background-color: transparent;\n    width: var(--cables-scrollbar-width);\n}\n\n.sidebar-cables::-webkit-scrollbar-thumb {\n    background-color: #333333;\n    border-radius: 4px;\n    width: var(--cables-scrollbar-width);\n}\n\n.sidebar-cables--closed {\n    width: auto;\n}\n\n.sidebar__close-button {\n    background-color: #222;\n    /*-webkit-user-select: none;  */\n    /*-moz-user-select: none;     */\n    /*-ms-user-select: none;      */\n    /*user-select: none;          */\n    /*transition: background-color var(--sidebar-hover-transition-time);*/\n    /*color: #CCCCCC;*/\n    height: 2px;\n    /*border-bottom:20px solid #222;*/\n\n    /*box-sizing: border-box;*/\n    /*padding-top: 2px;*/\n    /*text-align: center;*/\n    /*cursor: pointer;*/\n    /*border-radius: 0 0 var(--sidebar-border-radius) var(--sidebar-border-radius);*/\n    /*opacity: 1.0;*/\n    /*transition: opacity 0.3s;*/\n    /*overflow: hidden;*/\n}\n\n.sidebar__close-button-icon {\n    display: inline-block;\n    /*opacity: 0;*/\n    width: 20px;\n    height: 20px;\n    /*position: relative;*/\n    /*top: -1px;*/\n\n\n}\n\n.sidebar--closed {\n    width: auto;\n    margin-right: 20px;\n}\n\n.sidebar--closed .sidebar__close-button {\n    margin-top: 8px;\n    margin-left: 8px;\n    padding:10px;\n\n    height: 25px;\n    width:25px;\n    border-radius: 50%;\n    cursor: pointer;\n    opacity: 0.3;\n    background-repeat: no-repeat;\n    background-position: center center;\n    transform:rotate(180deg);\n}\n\n.sidebar--closed .sidebar__group\n{\n    display:none;\n\n}\n.sidebar--closed .sidebar__close-button-icon {\n    background-position: 0px 0px;\n}\n\n.sidebar__close-button:hover {\n    background-color: #111111;\n    opacity: 1.0 !important;\n}\n\n/*\n * SIDEBAR ITEMS\n */\n\n.sidebar__items {\n    /* max-height: 1000px; */\n    /* transition: max-height 0.5;*/\n    background-color: #222;\n    padding-bottom: 20px;\n}\n\n.sidebar--closed .sidebar__items {\n    /* max-height: 0; */\n    height: 0;\n    display: none;\n    pointer-interactions: none;\n}\n\n.sidebar__item__right {\n    float: right;\n}\n\n/*\n * SIDEBAR GROUP\n */\n\n.sidebar__group {\n    /*background-color: #1A1A1A;*/\n    overflow: hidden;\n    box-sizing: border-box;\n    animate: height;\n    /*background-color: #151515;*/\n    /* max-height: 1000px; */\n    /* transition: max-height 0.5s; */\n--sidebar-group-header-height: 33px;\n}\n\n.sidebar__group-items\n{\n    padding-top: 15px;\n    padding-bottom: 15px;\n}\n\n.sidebar__group--closed {\n    /* max-height: 13px; */\n    height: var(--sidebar-group-header-height);\n}\n\n.sidebar__group-header {\n    box-sizing: border-box;\n    color: #EEEEEE;\n    background-color: #151515;\n    -webkit-user-select: none;  /* Chrome all / Safari all */\n    -moz-user-select: none;     /* Firefox all */\n    -ms-user-select: none;      /* IE 10+ */\n    user-select: none;          /* Likely future */\n\n    /*height: 100%;//var(--sidebar-group-header-height);*/\n\n    padding-top: 7px;\n    text-transform: uppercase;\n    letter-spacing: 0.08em;\n    cursor: pointer;\n    /*transition: background-color var(--sidebar-hover-transition-time);*/\n    position: relative;\n}\n\n.sidebar__group-header:hover {\n  background-color: #111111;\n}\n\n.sidebar__group-header-title {\n  /*float: left;*/\n  overflow: hidden;\n  padding: 0 15px;\n  padding-top:5px;\n  padding-bottom:10px;\n  font-weight:bold;\n}\n\n.sidebar__group-header-undo {\n    float: right;\n    overflow: hidden;\n    padding-right: 15px;\n    padding-top:5px;\n    font-weight:bold;\n  }\n\n.sidebar__group-header-icon {\n    width: 17px;\n    height: 14px;\n    background-repeat: no-repeat;\n    display: inline-block;\n    position: absolute;\n    background-size: cover;\n\n    /* icon open */\n    /* feather icon: chevron up */\n    background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODg4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWNoZXZyb24tdXAiPjxwb2x5bGluZSBwb2ludHM9IjE4IDE1IDEyIDkgNiAxNSI+PC9wb2x5bGluZT48L3N2Zz4=);\n    top: 4px;\n    right: 5px;\n    opacity: 0.0;\n    transition: opacity 0.3;\n}\n\n.sidebar__group-header:hover .sidebar__group-header-icon {\n    opacity: 1.0;\n}\n\n/* icon closed */\n.sidebar__group--closed .sidebar__group-header-icon {\n    /* feather icon: chevron down */\n    background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODg4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWNoZXZyb24tZG93biI+PHBvbHlsaW5lIHBvaW50cz0iNiA5IDEyIDE1IDE4IDkiPjwvcG9seWxpbmU+PC9zdmc+);\n    top: 4px;\n    right: 5px;\n}\n\n/*\n * SIDEBAR ITEM\n */\n\n.sidebar__item\n{\n    box-sizing: border-box;\n    padding: 7px;\n    padding-left:15px;\n    padding-right:15px;\n\n    overflow: hidden;\n    position: relative;\n}\n\n.sidebar__item-label {\n    display: inline-block;\n    -webkit-user-select: none;  /* Chrome all / Safari all */\n    -moz-user-select: none;     /* Firefox all */\n    -ms-user-select: none;      /* IE 10+ */\n    user-select: none;          /* Likely future */\n    width: calc(50% - 7px);\n    margin-right: 7px;\n    margin-top: 2px;\n    text-overflow: ellipsis;\n    /* overflow: hidden; */\n}\n\n.sidebar__item-value-label {\n    font-family: var(--sidebar-monospace-font-stack);\n    display: inline-block;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    white-space: nowrap;\n    max-width: 60%;\n}\n\n.sidebar__item-value-label::selection {\n    background-color: var(--sidebar-color);\n    color: #EEEEEE;\n}\n\n.sidebar__item + .sidebar__item,\n.sidebar__item + .sidebar__group,\n.sidebar__group + .sidebar__item,\n.sidebar__group + .sidebar__group {\n    /*border-top: 1px solid #272727;*/\n}\n\n/*\n * SIDEBAR ITEM TOGGLE\n */\n\n/*.sidebar__toggle */\n.icon_toggle{\n    cursor: pointer;\n}\n\n.sidebar__toggle-input {\n    --sidebar-toggle-input-color: #CCCCCC;\n    --sidebar-toggle-input-color-hover: #EEEEEE;\n    --sidebar-toggle-input-border-size: 2px;\n    display: inline;\n    float: right;\n    box-sizing: border-box;\n    border-radius: 50%;\n    cursor: pointer;\n    --toggle-size: 11px;\n    margin-top: 2px;\n    background-color: transparent !important;\n    border: var(--sidebar-toggle-input-border-size) solid var(--sidebar-toggle-input-color);\n    width: var(--toggle-size);\n    height: var(--toggle-size);\n    transition: background-color var(--sidebar-hover-transition-time);\n    transition: border-color var(--sidebar-hover-transition-time);\n}\n.sidebar__toggle:hover .sidebar__toggle-input {\n    border-color: var(--sidebar-toggle-input-color-hover);\n}\n\n.sidebar__toggle .sidebar__item-value-label {\n    -webkit-user-select: none;  /* Chrome all / Safari all */\n    -moz-user-select: none;     /* Firefox all */\n    -ms-user-select: none;      /* IE 10+ */\n    user-select: none;          /* Likely future */\n    max-width: calc(50% - 12px);\n}\n.sidebar__toggle-input::after { clear: both; }\n\n.sidebar__toggle--active .icon_toggle\n{\n\n    background-image: url(data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjE1cHgiIHdpZHRoPSIzMHB4IiBmaWxsPSIjMDZmNzhiIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMTAwIDEwMCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGcgZGlzcGxheT0ibm9uZSI+PGcgZGlzcGxheT0iaW5saW5lIj48Zz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iIzA2Zjc4YiIgZD0iTTMwLDI3QzE3LjM1LDI3LDcsMzcuMzUsNyw1MGwwLDBjMCwxMi42NSwxMC4zNSwyMywyMywyM2g0MCBjMTIuNjUsMCwyMy0xMC4zNSwyMy0yM2wwLDBjMC0xMi42NS0xMC4zNS0yMy0yMy0yM0gzMHogTTcwLDY3Yy05LjM4OSwwLTE3LTcuNjEtMTctMTdzNy42MTEtMTcsMTctMTdzMTcsNy42MSwxNywxNyAgICAgUzc5LjM4OSw2Nyw3MCw2N3oiPjwvcGF0aD48L2c+PC9nPjwvZz48Zz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTMwLDI3QzE3LjM1LDI3LDcsMzcuMzUsNyw1MGwwLDBjMCwxMi42NSwxMC4zNSwyMywyMywyM2g0MCAgIGMxMi42NSwwLDIzLTEwLjM1LDIzLTIzbDAsMGMwLTEyLjY1LTEwLjM1LTIzLTIzLTIzSDMweiBNNzAsNjdjLTkuMzg5LDAtMTctNy42MS0xNy0xN3M3LjYxMS0xNywxNy0xN3MxNyw3LjYxLDE3LDE3ICAgUzc5LjM4OSw2Nyw3MCw2N3oiPjwvcGF0aD48L2c+PGcgZGlzcGxheT0ibm9uZSI+PGcgZGlzcGxheT0iaW5saW5lIj48cGF0aCBmaWxsPSIjMDZmNzhiIiBzdHJva2U9IiMwNmY3OGIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBkPSJNNyw1MGMwLDEyLjY1LDEwLjM1LDIzLDIzLDIzaDQwICAgIGMxMi42NSwwLDIzLTEwLjM1LDIzLTIzbDAsMGMwLTEyLjY1LTEwLjM1LTIzLTIzLTIzSDMwQzE3LjM1LDI3LDcsMzcuMzUsNyw1MEw3LDUweiI+PC9wYXRoPjwvZz48Y2lyY2xlIGRpc3BsYXk9ImlubGluZSIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiMwNmY3OGIiIHN0cm9rZT0iIzA2Zjc4YiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGN4PSI3MCIgY3k9IjUwIiByPSIxNyI+PC9jaXJjbGU+PC9nPjxnIGRpc3BsYXk9Im5vbmUiPjxwYXRoIGRpc3BsYXk9ImlubGluZSIgZD0iTTcwLDI1SDMwQzE2LjIxNSwyNSw1LDM2LjIxNSw1LDUwczExLjIxNSwyNSwyNSwyNWg0MGMxMy43ODUsMCwyNS0xMS4yMTUsMjUtMjVTODMuNzg1LDI1LDcwLDI1eiBNNzAsNzEgICBIMzBDMTguNDIxLDcxLDksNjEuNTc5LDksNTBzOS40MjEtMjEsMjEtMjFoNDBjMTEuNTc5LDAsMjEsOS40MjEsMjEsMjFTODEuNTc5LDcxLDcwLDcxeiBNNzAsMzFjLTEwLjQ3NywwLTE5LDguNTIzLTE5LDE5ICAgczguNTIzLDE5LDE5LDE5czE5LTguNTIzLDE5LTE5UzgwLjQ3NywzMSw3MCwzMXogTTcwLDY1Yy04LjI3MSwwLTE1LTYuNzI5LTE1LTE1czYuNzI5LTE1LDE1LTE1czE1LDYuNzI5LDE1LDE1Uzc4LjI3MSw2NSw3MCw2NXoiPjwvcGF0aD48L2c+PC9zdmc+);\n    opacity: 1;\n    transform: rotate(0deg);\n}\n\n\n.icon_toggle\n{\n    float: right;\n    width:40px;\n    height:18px;\n    background-image: url(data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjE1cHgiIHdpZHRoPSIzMHB4IiBmaWxsPSIjYWFhYWFhIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMTAwIDEwMCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGcgZGlzcGxheT0ibm9uZSI+PGcgZGlzcGxheT0iaW5saW5lIj48Zz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI2FhYWFhYSIgZD0iTTMwLDI3QzE3LjM1LDI3LDcsMzcuMzUsNyw1MGwwLDBjMCwxMi42NSwxMC4zNSwyMywyMywyM2g0MCBjMTIuNjUsMCwyMy0xMC4zNSwyMy0yM2wwLDBjMC0xMi42NS0xMC4zNS0yMy0yMy0yM0gzMHogTTcwLDY3Yy05LjM4OSwwLTE3LTcuNjEtMTctMTdzNy42MTEtMTcsMTctMTdzMTcsNy42MSwxNywxNyAgICAgUzc5LjM4OSw2Nyw3MCw2N3oiPjwvcGF0aD48L2c+PC9nPjwvZz48Zz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTMwLDI3QzE3LjM1LDI3LDcsMzcuMzUsNyw1MGwwLDBjMCwxMi42NSwxMC4zNSwyMywyMywyM2g0MCAgIGMxMi42NSwwLDIzLTEwLjM1LDIzLTIzbDAsMGMwLTEyLjY1LTEwLjM1LTIzLTIzLTIzSDMweiBNNzAsNjdjLTkuMzg5LDAtMTctNy42MS0xNy0xN3M3LjYxMS0xNywxNy0xN3MxNyw3LjYxLDE3LDE3ICAgUzc5LjM4OSw2Nyw3MCw2N3oiPjwvcGF0aD48L2c+PGcgZGlzcGxheT0ibm9uZSI+PGcgZGlzcGxheT0iaW5saW5lIj48cGF0aCBmaWxsPSIjYWFhYWFhIiBzdHJva2U9IiNhYWFhYWEiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBkPSJNNyw1MGMwLDEyLjY1LDEwLjM1LDIzLDIzLDIzaDQwICAgIGMxMi42NSwwLDIzLTEwLjM1LDIzLTIzbDAsMGMwLTEyLjY1LTEwLjM1LTIzLTIzLTIzSDMwQzE3LjM1LDI3LDcsMzcuMzUsNyw1MEw3LDUweiI+PC9wYXRoPjwvZz48Y2lyY2xlIGRpc3BsYXk9ImlubGluZSIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiNhYWFhYWEiIHN0cm9rZT0iI2FhYWFhYSIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGN4PSI3MCIgY3k9IjUwIiByPSIxNyI+PC9jaXJjbGU+PC9nPjxnIGRpc3BsYXk9Im5vbmUiPjxwYXRoIGRpc3BsYXk9ImlubGluZSIgZD0iTTcwLDI1SDMwQzE2LjIxNSwyNSw1LDM2LjIxNSw1LDUwczExLjIxNSwyNSwyNSwyNWg0MGMxMy43ODUsMCwyNS0xMS4yMTUsMjUtMjVTODMuNzg1LDI1LDcwLDI1eiBNNzAsNzEgICBIMzBDMTguNDIxLDcxLDksNjEuNTc5LDksNTBzOS40MjEtMjEsMjEtMjFoNDBjMTEuNTc5LDAsMjEsOS40MjEsMjEsMjFTODEuNTc5LDcxLDcwLDcxeiBNNzAsMzFjLTEwLjQ3NywwLTE5LDguNTIzLTE5LDE5ICAgczguNTIzLDE5LDE5LDE5czE5LTguNTIzLDE5LTE5UzgwLjQ3NywzMSw3MCwzMXogTTcwLDY1Yy04LjI3MSwwLTE1LTYuNzI5LTE1LTE1czYuNzI5LTE1LDE1LTE1czE1LDYuNzI5LDE1LDE1Uzc4LjI3MSw2NSw3MCw2NXoiPjwvcGF0aD48L2c+PC9zdmc+);\n    background-size: 50px 37px;\n    background-position: -6px -10px;\n    transform: rotate(180deg);\n    opacity: 0.4;\n}\n\n\n\n/*.sidebar__toggle--active .sidebar__toggle-input {*/\n/*    transition: background-color var(--sidebar-hover-transition-time);*/\n/*    background-color: var(--sidebar-toggle-input-color);*/\n/*}*/\n/*.sidebar__toggle--active .sidebar__toggle-input:hover*/\n/*{*/\n/*    background-color: var(--sidebar-toggle-input-color-hover);*/\n/*    border-color: var(--sidebar-toggle-input-color-hover);*/\n/*    transition: background-color var(--sidebar-hover-transition-time);*/\n/*    transition: border-color var(--sidebar-hover-transition-time);*/\n/*}*/\n\n/*\n * SIDEBAR ITEM BUTTON\n */\n\n.sidebar__button {}\n\n.sidebar__button-input:active\n{\n    background-color: #555 !important;\n}\n\n.sidebar__button-input {\n    -webkit-user-select: none;  /* Chrome all / Safari all */\n    -moz-user-select: none;     /* Firefox all */\n    -ms-user-select: none;      /* IE 10+ */\n    user-select: none;          /* Likely future */\n    min-height: 24px;\n    background-color: transparent;\n    color: #CCCCCC;\n    box-sizing: border-box;\n    padding-top: 3px;\n    text-align: center;\n    border-radius: 125px;\n    border:2px solid #555;\n    cursor: pointer;\n    padding-bottom: 3px;\n}\n\n.sidebar__button-input.plus, .sidebar__button-input.minus {\n    display: inline-block;\n    min-width: 20px;\n}\n\n.sidebar__button-input:hover {\n  background-color: #333;\n  border:2px solid var(--sidebar-color);\n}\n\n/*\n * VALUE DISPLAY (shows a value)\n */\n\n.sidebar__value-display {}\n\n/*\n * SLIDER\n */\n\n.sidebar__slider {\n    --sidebar-slider-input-height: 3px;\n}\n\n.sidebar__slider-input-wrapper {\n    width: 100%;\n\n    margin-top: 8px;\n    position: relative;\n}\n\n.sidebar__slider-input {\n    -webkit-appearance: none;\n    appearance: none;\n    margin: 0;\n    width: 100%;\n    height: var(--sidebar-slider-input-height);\n    background: #555;\n    cursor: pointer;\n    outline: 0;\n\n    -webkit-transition: .2s;\n    transition: background-color .2s;\n    border: none;\n}\n\n.sidebar__slider-input:focus, .sidebar__slider-input:hover {\n    border: none;\n}\n\n.sidebar__slider-input-active-track {\n    user-select: none;\n    position: absolute;\n    z-index: 11;\n    top: 0;\n    left: 0;\n    background-color: var(--sidebar-color);\n    pointer-events: none;\n    height: var(--sidebar-slider-input-height);\n    max-width: 100%;\n}\n\n/* Mouse-over effects */\n.sidebar__slider-input:hover {\n    /*background-color: #444444;*/\n}\n\n/*.sidebar__slider-input::-webkit-progress-value {*/\n/*    background-color: green;*/\n/*    color:green;*/\n\n/*    }*/\n\n/* The slider handle (use -webkit- (Chrome, Opera, Safari, Edge) and -moz- (Firefox) to override default look) */\n\n.sidebar__slider-input::-moz-range-thumb\n{\n    position: absolute;\n    height: 15px;\n    width: 15px;\n    z-index: 900 !important;\n    border-radius: 20px !important;\n    cursor: pointer;\n    background: var(--sidebar-color) !important;\n    user-select: none;\n\n}\n\n.sidebar__slider-input::-webkit-slider-thumb\n{\n    position: relative;\n    appearance: none;\n    -webkit-appearance: none;\n    user-select: none;\n    height: 15px;\n    width: 15px;\n    display: block;\n    z-index: 900 !important;\n    border: 0;\n    border-radius: 20px !important;\n    cursor: pointer;\n    background: #777 !important;\n}\n\n.sidebar__slider-input:hover ::-webkit-slider-thumb {\n    background-color: #EEEEEE !important;\n}\n\n/*.sidebar__slider-input::-moz-range-thumb {*/\n\n/*    width: 0 !important;*/\n/*    height: var(--sidebar-slider-input-height);*/\n/*    background: #EEEEEE;*/\n/*    cursor: pointer;*/\n/*    border-radius: 0 !important;*/\n/*    border: none;*/\n/*    outline: 0;*/\n/*    z-index: 100 !important;*/\n/*}*/\n\n.sidebar__slider-input::-moz-range-track {\n    background-color: transparent;\n    z-index: 11;\n}\n\n/*.sidebar__slider-input::-moz-range-thumb:hover {*/\n  /* background-color: #EEEEEE; */\n/*}*/\n\n\n/*.sidebar__slider-input-wrapper:hover .sidebar__slider-input-active-track {*/\n/*    background-color: #EEEEEE;*/\n/*}*/\n\n/*.sidebar__slider-input-wrapper:hover .sidebar__slider-input::-moz-range-thumb {*/\n/*    background-color: #fff !important;*/\n/*}*/\n\n/*.sidebar__slider-input-wrapper:hover .sidebar__slider-input::-webkit-slider-thumb {*/\n/*    background-color: #EEEEEE;*/\n/*}*/\n\n.sidebar__slider input[type=text],\n.sidebar__slider input[type=paddword]\n{\n    box-sizing: border-box;\n    /*background-color: #333333;*/\n    text-align: right;\n    color: #BBBBBB;\n    display: inline-block;\n    background-color: transparent !important;\n\n    width: 40%;\n    height: 18px;\n    outline: none;\n    border: none;\n    border-radius: 0;\n    padding: 0 0 0 4px !important;\n    margin: 0;\n}\n\n.sidebar__slider input[type=text]:active,\n.sidebar__slider input[type=text]:focus,\n.sidebar__slider input[type=text]:hover\n.sidebar__slider input[type=password]:active,\n.sidebar__slider input[type=password]:focus,\n.sidebar__slider input[type=password]:hover\n{\n\n    color: #EEEEEE;\n}\n\n/*\n * TEXT / DESCRIPTION\n */\n\n.sidebar__text .sidebar__item-label {\n    width: auto;\n    display: block;\n    max-height: none;\n    margin-right: 0;\n    line-height: 1.1em;\n}\n\n/*\n * SIDEBAR INPUT\n */\n.sidebar__text-input textarea,\n.sidebar__text-input input[type=date],\n.sidebar__text-input input[type=datetime-local],\n.sidebar__text-input input[type=text],\n.sidebar__text-input input[type=password] {\n    box-sizing: border-box;\n    background-color: #333333;\n    color: #BBBBBB;\n    display: inline-block;\n    width: 50%;\n    height: 18px;\n    outline: none;\n    border: none;\n    border-radius: 0;\n    border:1px solid #666;\n    padding: 0 0 0 4px !important;\n    margin: 0;\n    color-scheme: dark;\n}\n\n.sidebar__text-input textarea:focus::placeholder {\n  color: transparent;\n}\n\n.sidebar__color-picker .sidebar__item-label\n{\n    width:45%;\n}\n\n.sidebar__text-input textarea,\n.sidebar__text-input input[type=text]:active,\n.sidebar__text-input input[type=text]:focus,\n.sidebar__text-input input[type=text]:hover,\n.sidebar__text-input input[type=password]:active,\n.sidebar__text-input input[type=password]:focus,\n.sidebar__text-input input[type=password]:hover {\n    background-color: transparent;\n    color: #EEEEEE;\n}\n\n.sidebar__text-input textarea\n{\n    margin-top:10px;\n    height:60px;\n    width:100%;\n}\n\n/*\n * SIDEBAR SELECT\n */\n\n\n\n .sidebar__select {}\n .sidebar__select-select {\n    color: #BBBBBB;\n    /*-webkit-appearance: none;*/\n    /*-moz-appearance: none;*/\n    appearance: none;\n    /*box-sizing: border-box;*/\n    width: 50%;\n    /*height: 20px;*/\n    background-color: #333333;\n    /*background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODg4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWNoZXZyb24tZG93biI+PHBvbHlsaW5lIHBvaW50cz0iNiA5IDEyIDE1IDE4IDkiPjwvcG9seWxpbmU+PC9zdmc+);*/\n    background-repeat: no-repeat;\n    background-position: right center;\n    background-size: 16px 16px;\n    margin: 0;\n    /*padding: 0 2 2 6px;*/\n    border-radius: 5px;\n    border: 1px solid #777;\n    background-color: #444;\n    cursor: pointer;\n    outline: none;\n    padding-left: 5px;\n\n }\n\n.sidebar__select-select:hover,\n.sidebar__select-select:active,\n.sidebar__select-select:inactive {\n    background-color: #444444;\n    color: #EEEEEE;\n}\n\n/*.sidebar__select-select option*/\n/*{*/\n/*    background-color: #444444;*/\n/*    color: #bbb;*/\n/*}*/\n\n.sidebar__select-select option:checked\n{\n    background-color: #000;\n    color: #FFF;\n}\n\n\n/*\n * COLOR PICKER\n */\n\n\n .sidebar__color-picker input[type=text] {\n    box-sizing: border-box;\n    background-color: #333333;\n    color: #BBBBBB;\n    display: inline-block;\n    width: calc(50% - 21px); /* 50% minus space of picker circle */\n    height: 18px;\n    outline: none;\n    border: none;\n    border-radius: 0;\n    padding: 0 0 0 4px !important;\n    margin: 0;\n    margin-right: 7px;\n}\n\n.sidebar__color-picker input[type=text]:active,\n.sidebar__color-picker input[type=text]:focus,\n.sidebar__color-picker input[type=text]:hover {\n    background-color: #444444;\n    color: #EEEEEE;\n}\n\ndiv.sidebar__color-picker-color-input,\n.sidebar__color-picker input[type=color],\n.sidebar__palette-picker input[type=color] {\n    display: inline-block;\n    border-radius: 100%;\n    height: 14px;\n    width: 14px;\n\n    padding: 0;\n    border: none;\n    /*border:2px solid red;*/\n    border-color: transparent;\n    outline: none;\n    background: none;\n    appearance: none;\n    -moz-appearance: none;\n    -webkit-appearance: none;\n    cursor: pointer;\n    position: relative;\n    top: 3px;\n}\n.sidebar__color-picker input[type=color]:focus,\n.sidebar__palette-picker input[type=color]:focus {\n    outline: none;\n}\n.sidebar__color-picker input[type=color]::-moz-color-swatch,\n.sidebar__palette-picker input[type=color]::-moz-color-swatch {\n    border: none;\n}\n.sidebar__color-picker input[type=color]::-webkit-color-swatch-wrapper,\n.sidebar__palette-picker input[type=color]::-webkit-color-swatch-wrapper {\n    padding: 0;\n}\n.sidebar__color-picker input[type=color]::-webkit-color-swatch,\n.sidebar__palette-picker input[type=color]::-webkit-color-swatch {\n    border: none;\n    border-radius: 100%;\n}\n\n/*\n * Palette Picker\n */\n.sidebar__palette-picker .sidebar__palette-picker-color-input.first {\n    margin-left: 0;\n}\n.sidebar__palette-picker .sidebar__palette-picker-color-input.last {\n    margin-right: 0;\n}\n.sidebar__palette-picker .sidebar__palette-picker-color-input {\n    margin: 0 4px;\n}\n\n.sidebar__palette-picker .circlebutton {\n    width: 14px;\n    height: 14px;\n    border-radius: 1em;\n    display: inline-block;\n    top: 3px;\n    position: relative;\n}\n\n/*\n * Preset\n */\n.sidebar__item-presets-preset\n{\n    padding:4px;\n    cursor:pointer;\n    padding-left:8px;\n    padding-right:8px;\n    margin-right:4px;\n    background-color:#444;\n}\n\n.sidebar__item-presets-preset:hover\n{\n    background-color:#666;\n}\n\n.sidebar__greyout\n{\n    background: #222;\n    opacity: 0.8;\n    width: 100%;\n    height: 100%;\n    position: absolute;\n    z-index: 1000;\n    right: 0;\n    top: 0;\n}\n\n.sidebar_tabs\n{\n    background-color: #151515;\n    padding-bottom: 0px;\n}\n\n.sidebar_switchs\n{\n    float: right;\n}\n\n.sidebar_tab\n{\n    float:left;\n    background-color: #151515;\n    border-bottom:1px solid transparent;\n    padding-right:7px;\n    padding-left:7px;\n    padding-bottom: 5px;\n    padding-top: 5px;\n    cursor:pointer;\n}\n\n.sidebar_tab_active\n{\n    background-color: #272727;\n    color:white;\n}\n\n.sidebar_tab:hover\n{\n    border-bottom:1px solid #777;\n    color:white;\n}\n\n\n.sidebar_switch\n{\n    float:left;\n    background-color: #444;\n    padding-right:7px;\n    padding-left:7px;\n    padding-bottom: 5px;\n    padding-top: 5px;\n    cursor:pointer;\n}\n\n.sidebar_switch:last-child\n{\n    border-top-right-radius: 7px;\n    border-bottom-right-radius: 7px;\n}\n\n.sidebar_switch:first-child\n{\n    border-top-left-radius: 7px;\n    border-bottom-left-radius: 7px;\n}\n\n\n.sidebar_switch_active\n{\n    background-color: #999;\n    color:white;\n}\n\n.sidebar_switch:hover\n{\n    color:white;\n}\n\n",};
// vars
const CSS_ELEMENT_CLASS = "cables-sidebar-style"; /* class for the style element to be generated */
const CSS_ELEMENT_DYNAMIC_CLASS = "cables-sidebar-dynamic-style"; /* things which can be set via op-port, but not attached to the elements themselves, e.g. minimized opacity */
const SIDEBAR_CLASS = "sidebar-cables";
const SIDEBAR_ID = "sidebar" + CABLES.uuid();
const SIDEBAR_ITEMS_CLASS = "sidebar__items";
const SIDEBAR_OPEN_CLOSE_BTN_CLASS = "sidebar__close-button";

const BTN_TEXT_OPEN = ""; // 'Close';
const BTN_TEXT_CLOSED = ""; // 'Show Controls';

let openCloseBtn = null;
let openCloseBtnIcon = null;
let headerTitleText = null;

// inputs
const visiblePort = op.inValueBool("Visible", true);
const opacityPort = op.inValueSlider("Opacity", 1);
const defaultMinimizedPort = op.inValueBool("Default Minimized");
const minimizedOpacityPort = op.inValueSlider("Minimized Opacity", 0.5);
const undoButtonPort = op.inValueBool("Show undo button", false);
const inMinimize = op.inValueBool("Show Minimize", false);

const inTitle = op.inString("Title", "");
const side = op.inValueBool("Side");
const addCss = op.inValueBool("Default CSS", true);

let doc = op.patch.cgl.canvas.ownerDocument;

// outputs
const childrenPort = op.outObject("childs");
childrenPort.setUiAttribs({ "title": "Children" });

const isOpenOut = op.outBool("Opfened");
isOpenOut.setUiAttribs({ "title": "Opened" });

let sidebarEl = doc.querySelector("." + SIDEBAR_ID);
if (!sidebarEl) sidebarEl = initSidebarElement();

const sidebarItemsEl = sidebarEl.querySelector("." + SIDEBAR_ITEMS_CLASS);
childrenPort.set({
    "parentElement": sidebarItemsEl,
    "parentOp": op,
});
onDefaultMinimizedPortChanged();
initSidebarCss();
updateDynamicStyles();

addCss.onChange = () =>
{
    initSidebarCss();
    updateDynamicStyles();
};
visiblePort.onChange = onVisiblePortChange;
opacityPort.onChange = onOpacityPortChange;
defaultMinimizedPort.onChange = onDefaultMinimizedPortChanged;
minimizedOpacityPort.onChange = onMinimizedOpacityPortChanged;
undoButtonPort.onChange = onUndoButtonChange;
op.onDelete = onDelete;

function onMinimizedOpacityPortChanged()
{
    updateDynamicStyles();
}

inMinimize.onChange = updateMinimize;

function updateMinimize(header)
{
    if (!header || header.uiAttribs) header = doc.querySelector(".sidebar-cables .sidebar__group-header");
    if (!header) return;

    const undoButton = doc.querySelector(".sidebar-cables .sidebar__group-header .sidebar__group-header-undo");

    if (inMinimize.get())
    {
        header.classList.add("iconsidebar-chevron-up");
        header.classList.add("iconsidebar-minimizebutton");

        if (undoButton)undoButton.style.marginRight = "20px";
    }
    else
    {
        header.classList.remove("iconsidebar-chevron-up");
        header.classList.remove("iconsidebar-minimizebutton");

        if (undoButton)undoButton.style.marginRight = "initial";
    }
}

side.onChange = function ()
{
    if (!sidebarEl) return;
    if (side.get()) sidebarEl.classList.add("sidebar-cables-right");
    else sidebarEl.classList.remove("sidebar-cables-right");
};

function onUndoButtonChange()
{
    const header = doc.querySelector(".sidebar-cables .sidebar__group-header");
    if (header)
    {
        initUndoButton(header);
    }
}

function initUndoButton(header)
{
    if (header)
    {
        const undoButton = doc.querySelector(".sidebar-cables .sidebar__group-header .sidebar__group-header-undo");
        if (undoButton)
        {
            if (!undoButtonPort.get())
            {
                // header.removeChild(undoButton);
                undoButton.remove();
            }
        }
        else
        {
            if (undoButtonPort.get())
            {
                const headerUndo = doc.createElement("span");
                headerUndo.classList.add("sidebar__group-header-undo");
                headerUndo.classList.add("sidebar-icon-undo");

                headerUndo.addEventListener("click", function (event)
                {
                    event.stopPropagation();
                    const reloadables = doc.querySelectorAll(".sidebar-cables .sidebar__reloadable");
                    const doubleClickEvent = doc.createEvent("MouseEvents");
                    doubleClickEvent.initEvent("dblclick", true, true);
                    reloadables.forEach((reloadable) =>
                    {
                        reloadable.dispatchEvent(doubleClickEvent);
                    });
                });
                header.appendChild(headerUndo);
            }
        }
    }
    updateMinimize(header);
}

function onDefaultMinimizedPortChanged()
{
    if (!openCloseBtn) { return; }
    if (defaultMinimizedPort.get())
    {
        sidebarEl.classList.add("sidebar--closed");
        if (visiblePort.get()) isOpenOut.set(false);
    }
    else
    {
        sidebarEl.classList.remove("sidebar--closed");
        if (visiblePort.get()) isOpenOut.set(true);
    }
}

function onOpacityPortChange()
{
    const opacity = opacityPort.get();
    sidebarEl.style.opacity = opacity;
}

function onVisiblePortChange()
{
    if (!sidebarEl) return;
    if (visiblePort.get())
    {
        sidebarEl.style.display = "block";
        if (!sidebarEl.classList.contains("sidebar--closed")) isOpenOut.set(true);
    }
    else
    {
        sidebarEl.style.display = "none";
        isOpenOut.set(false);
    }
}

side.onChanged = function ()
{

};

/**
 * Some styles cannot be set directly inline, so a dynamic stylesheet is needed.
 * Here hover states can be set later on e.g.
 */
function updateDynamicStyles()
{
    const dynamicStyles = doc.querySelectorAll("." + CSS_ELEMENT_DYNAMIC_CLASS);
    if (dynamicStyles)
    {
        dynamicStyles.forEach(function (e)
        {
            e.parentNode.removeChild(e);
        });
    }

    if (!addCss.get()) return;

    const newDynamicStyle = doc.createElement("style");
    newDynamicStyle.classList.add("cablesEle");
    newDynamicStyle.classList.add(CSS_ELEMENT_DYNAMIC_CLASS);
    let cssText = ".sidebar--closed .sidebar__close-button { ";
    cssText += "opacity: " + minimizedOpacityPort.get();
    cssText += "}";
    const cssTextEl = doc.createTextNode(cssText);
    newDynamicStyle.appendChild(cssTextEl);
    doc.body.appendChild(newDynamicStyle);
}

function initSidebarElement()
{
    const element = doc.createElement("div");
    element.classList.add(SIDEBAR_CLASS);
    element.classList.add(SIDEBAR_ID);
    const canvasWrapper = op.patch.cgl.canvas.parentElement; /* maybe this is bad outside cables!? */

    // header...
    const headerGroup = doc.createElement("div");
    headerGroup.classList.add("sidebar__group");

    element.appendChild(headerGroup);
    const header = doc.createElement("div");
    header.classList.add("sidebar__group-header");

    element.appendChild(header);
    const headerTitle = doc.createElement("span");
    headerTitle.classList.add("sidebar__group-header-title");
    headerTitleText = doc.createElement("span");
    headerTitleText.classList.add("sidebar__group-header-title-text");
    headerTitleText.innerHTML = inTitle.get();
    headerTitle.appendChild(headerTitleText);
    header.appendChild(headerTitle);

    initUndoButton(header);
    updateMinimize(header);

    headerGroup.appendChild(header);
    element.appendChild(headerGroup);
    headerGroup.addEventListener("click", onOpenCloseBtnClick);

    if (!canvasWrapper)
    {
        op.warn("[sidebar] no canvas parentelement found...");
        return;
    }
    canvasWrapper.appendChild(element);
    const items = doc.createElement("div");
    items.classList.add(SIDEBAR_ITEMS_CLASS);
    element.appendChild(items);
    openCloseBtn = doc.createElement("div");
    openCloseBtn.classList.add(SIDEBAR_OPEN_CLOSE_BTN_CLASS);
    openCloseBtn.addEventListener("click", onOpenCloseBtnClick);
    element.appendChild(openCloseBtn);

    return element;
}

inTitle.onChange = function ()
{
    if (headerTitleText)headerTitleText.innerHTML = inTitle.get();
};

function setClosed(b)
{

}

function onOpenCloseBtnClick(ev)
{
    ev.stopPropagation();
    if (!sidebarEl) { op.logError("Sidebar could not be closed..."); return; }
    sidebarEl.classList.toggle("sidebar--closed");
    const btn = ev.target;
    let btnText = BTN_TEXT_OPEN;
    if (sidebarEl.classList.contains("sidebar--closed"))
    {
        btnText = BTN_TEXT_CLOSED;
        isOpenOut.set(false);
    }
    else
    {
        isOpenOut.set(true);
    }
}

function initSidebarCss()
{
    const cssElements = doc.querySelectorAll("." + CSS_ELEMENT_CLASS);
    // remove old script tag
    if (cssElements)
    {
        cssElements.forEach((e) =>
        {
            e.parentNode.removeChild(e);
        });
    }

    if (!addCss.get()) return;

    const newStyle = doc.createElement("style");

    newStyle.innerHTML = attachments.style_css;
    newStyle.classList.add(CSS_ELEMENT_CLASS);
    newStyle.classList.add("cablesEle");
    doc.body.appendChild(newStyle);
}

function onDelete()
{
    removeElementFromDOM(sidebarEl);
}

function removeElementFromDOM(el)
{
    if (el && el.parentNode && el.parentNode.removeChild) el.parentNode.removeChild(el);
}


};

Ops.Sidebar.Sidebar.prototype = new CABLES.Op();
CABLES.OPS["5a681c35-78ce-4cb3-9858-bc79c34c6819"]={f:Ops.Sidebar.Sidebar,objName:"Ops.Sidebar.Sidebar"};




// **************************************************************
// 
// Ops.Gl.Performance
// 
// **************************************************************

Ops.Gl.Performance = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    exe = op.inTrigger("exe"),
    inShow = op.inValueBool("Visible", true),
    inDoGpu = op.inValueBool("Measure GPU", true),
    next = op.outTrigger("childs"),
    position = op.inSwitch("Position", ["top", "bottom"], "top"),
    openDefault = op.inBool("Open", false),
    smoothGraph = op.inBool("Smooth Graph", true),
    inScaleGraph = op.inFloat("Scale", 3),
    inSizeGraph = op.inFloat("Size", 128),
    outCanv = op.outObject("Canvas"),
    outFPS = op.outNumber("FPS");

const cgl = op.patch.cgl;
const element = document.createElement("div");

let elementMeasures = null;
let ctx = null;
let opened = false;
let frameCount = 0;
let fps = 0;
let fpsStartTime = 0;
let childsTime = 0;
let avgMsChilds = 0;
const queue = [];
const timesMainloop = [];
const timesOnFrame = [];
const timesGPU = [];
let avgMs = 0;
let selfTime = 0;
let canvas = null;
let lastTime = 0;
let loadingCounter = 0;
const loadingChars = ["|", "/", "-", "\\"];
let initMeasures = true;

const colorRAFSlow = "#007f9c";
const colorRAFVeruSlow = "#aaaaaa";

const colorBg = "#222222";
const colorRAF = "#003f5c"; // color: https://learnui.design/tools/data-color-picker.html
const colorMainloop = "#7a5195";
const colorOnFrame = "#ef5675";
const colorGPU = "#ffa600";

let startedQuery = false;

let currentTimeGPU = 0;
let currentTimeMainloop = 0;
let currentTimeOnFrame = 0;

op.toWorkPortsNeedToBeLinked(exe, next);

const gl = op.patch.cgl.gl;
const glQueryExt = gl.getExtension("EXT_disjoint_timer_query_webgl2");

exe.onLinkChanged =
    inShow.onChange = () =>
    {
        updateOpened();
        updateVisibility();
    };

position.onChange = updatePos;
inSizeGraph.onChange = updateSize;

element.id = "performance";
element.style.position = "absolute";
element.style.left = "0px";
element.style.opacity = "0.8";
element.style.padding = "10px";
element.style.cursor = "pointer";
element.style.background = "#222";
element.style.color = "white";
element.style["font-family"] = "monospace";
element.style["font-size"] = "12px";
element.style["z-index"] = "99999";

element.innerHTML = "&nbsp;";
element.addEventListener("click", toggleOpened);

const container = op.patch.cgl.canvas.parentElement;
container.appendChild(element);

updateSize();
updateOpened();
updatePos();
updateVisibility();

op.onDelete = function ()
{
    if (canvas)canvas.remove();
    if (element)element.remove();
};

function updatePos()
{
    canvas.style["pointer-events"] = "none";
    if (position.get() == "top")
    {
        canvas.style.top = element.style.top = "0px";
        canvas.style.bottom = element.style.bottom = "initial";
    }
    else
    {
        canvas.style.bottom = element.style.bottom = "0px";
        canvas.style.top = element.style.top = "initial";
    }
}

function updateVisibility()
{
    if (!inShow.get() || !exe.isLinked())
    {
        element.style.display = "none";
        element.style.opacity = 0;
        canvas.style.display = "none";
    }
    else
    {
        element.style.display = "block";
        element.style.opacity = 1;
        canvas.style.display = "block";
    }
}

function updateSize()
{
    if (!canvas) return;

    const num = Math.max(0, parseInt(inSizeGraph.get()));

    canvas.width = num;
    canvas.height = num;
    element.style.left = num + "px";

    queue.length = 0;
    timesMainloop.length = 0;
    timesOnFrame.length = 0;
    timesGPU.length = 0;

    for (let i = 0; i < num; i++)
    {
        queue[i] = -1;
        timesMainloop[i] = -1;
        timesOnFrame[i] = -1;
        timesGPU[i] = -1;
    }
}

openDefault.onChange = function ()
{
    opened = openDefault.get();
    updateOpened();
};

function toggleOpened()
{
    if (!inShow.get()) return;
    element.style.opacity = 1;
    opened = !opened;
    updateOpened();
}

function updateOpened()
{
    updateText();
    if (!canvas)createCanvas();
    if (opened)
    {
        canvas.style.display = "block";
        element.style.left = inSizeGraph.get() + "px";
        element.style["min-height"] = "56px";
    }
    else
    {
        canvas.style.display = "none";
        element.style.left = "0px";
        element.style["min-height"] = "auto";
    }
}

function updateCanvas()
{
    const height = canvas.height;
    const hmul = inScaleGraph.get();

    ctx.fillStyle = colorBg;
    ctx.fillRect(0, 0, canvas.width, height);

    ctx.fillStyle = colorRAF;

    let k = 0;
    const numBars = Math.max(0, parseInt(inSizeGraph.get()));

    for (k = numBars; k >= 0; k--)
    {
        if (queue[k] > 30) ctx.fillStyle = colorRAFSlow;
        if (queue[k] > 60) ctx.fillStyle = colorRAFVeruSlow;

        ctx.fillRect(numBars - k, height - queue[k] * hmul, 1, queue[k] * hmul);
        if (queue[k] > 30)ctx.fillStyle = colorRAF;
    }

    for (k = numBars; k >= 0; k--)
    {
        let sum = 0;
        ctx.fillStyle = colorMainloop;
        sum = timesMainloop[k];
        ctx.fillRect(numBars - k, height - sum * hmul, 1, timesMainloop[k] * hmul);

        ctx.fillStyle = colorOnFrame;
        sum += timesOnFrame[k];
        ctx.fillRect(numBars - k, height - sum * hmul, 1, timesOnFrame[k] * hmul);

        ctx.fillStyle = colorGPU;
        sum += timesGPU[k];
        ctx.fillRect(numBars - k, height - sum * hmul, 1, timesGPU[k] * hmul);
    }

    for (let i = 10; i < height; i += 10)
    {
        ctx.fillStyle = "#888";
        const y = height - (i * hmul);
        ctx.fillRect(canvas.width - 5, y, 5, 1);
        ctx.font = "8px arial";

        ctx.fillText(i + "ms", canvas.width - 27, y + 3);
    }

    ctx.fillStyle = "#fff";
    ctx.fillRect(canvas.width - 5, height - (1000 / fps * hmul), 5, 1);
    ctx.fillText(Math.round(1000 / fps) + "ms", canvas.width - 27, height - (1000 / fps * hmul));
}

function createCanvas()
{
    canvas = document.createElement("canvas");
    canvas.id = "performance_" + op.patch.config.glCanvasId;
    canvas.width = inSizeGraph.get();
    canvas.height = inSizeGraph.get();
    canvas.style.display = "block";
    canvas.style.opacity = 0.9;
    canvas.style.position = "absolute";
    canvas.style.left = "0px";
    canvas.style.cursor = "pointer";
    canvas.style.top = "-64px";
    canvas.style["z-index"] = "99998";
    container.appendChild(canvas);
    ctx = canvas.getContext("2d");

    canvas.addEventListener("click", toggleOpened);

    updateSize();
}

function updateText()
{
    if (!inShow.get()) return;
    let warn = "";

    if (op.patch.cgl.profileData.profileShaderCompiles > 0)warn += "Shader compile (" + op.patch.cgl.profileData.profileShaderCompileName + ") ";
    if (op.patch.cgl.profileData.profileShaderGetUniform > 0)warn += "Shader get uni loc! (" + op.patch.cgl.profileData.profileShaderGetUniformName + ")";
    if (op.patch.cgl.profileData.profileTextureResize > 0)warn += "Texture resize! ";
    if (op.patch.cgl.profileData.profileFrameBuffercreate > 0)warn += "Framebuffer create! ";
    if (op.patch.cgl.profileData.profileEffectBuffercreate > 0)warn += "Effectbuffer create! ";
    if (op.patch.cgl.profileData.profileTextureDelete > 0)warn += "Texture delete! ";
    if (op.patch.cgl.profileData.profileNonTypedAttrib > 0)warn += "Not-Typed Buffer Attrib! " + op.patch.cgl.profileData.profileNonTypedAttribNames;
    if (op.patch.cgl.profileData.profileTextureNew > 0)warn += "new texture created! ";
    if (op.patch.cgl.profileData.profileGenMipMap > 0)warn += "generating mip maps!";

    if (warn.length > 0)
    {
        warn = "| <span style=\"color:#f80;\">WARNING: " + warn + "<span>";
    }

    let html = "";

    if (opened)
    {
        html += "<span style=\"color:" + colorRAF + "\">■</span> " + fps + " fps ";
        html += "<span style=\"color:" + colorMainloop + "\">■</span> " + Math.round(currentTimeMainloop * 100) / 100 + "ms mainloop ";
        html += "<span style=\"color:" + colorOnFrame + "\">■</span> " + Math.round((currentTimeOnFrame) * 100) / 100 + "ms onframe ";
        if (currentTimeGPU) html += "<span style=\"color:" + colorGPU + "\">■</span> " + Math.round(currentTimeGPU * 100) / 100 + "ms GPU";
        html += warn;
        element.innerHTML = html;
    }
    else
    {
        html += fps + " fps / ";
        html += "CPU: " + Math.round((op.patch.cgl.profileData.profileOnAnimFrameOps) * 100) / 100 + "ms / ";
        if (currentTimeGPU)html += "GPU: " + Math.round(currentTimeGPU * 100) / 100 + "ms  ";
        element.innerHTML = html;
    }

    if (op.patch.loading.getProgress() != 1.0)
    {
        element.innerHTML += "<br/>loading " + Math.round(op.patch.loading.getProgress() * 100) + "% " + loadingChars[(++loadingCounter) % loadingChars.length];
    }

    if (opened)
    {
        let count = 0;
        avgMs = 0;
        avgMsChilds = 0;
        for (let i = queue.length; i > queue.length - queue.length / 3; i--)
        {
            if (queue[i] > -1)
            {
                avgMs += queue[i];
                count++;
            }

            if (timesMainloop[i] > -1) avgMsChilds += timesMainloop[i];
        }

        avgMs /= count;
        avgMsChilds /= count;

        element.innerHTML += "<br/> " + cgl.canvasWidth + " x " + cgl.canvasHeight + " (x" + cgl.pixelDensity + ") ";
        element.innerHTML += "<br/>frame avg: " + Math.round(avgMsChilds * 100) / 100 + " ms (" + Math.round(avgMsChilds / avgMs * 100) + "%) / " + Math.round(avgMs * 100) / 100 + " ms";
        element.innerHTML += " (self: " + Math.round((selfTime) * 100) / 100 + " ms) ";

        element.innerHTML += "<br/>shader binds: " + Math.ceil(op.patch.cgl.profileData.profileShaderBinds / fps) +
            " uniforms: " + Math.ceil(op.patch.cgl.profileData.profileUniformCount / fps) +
            " mvp_uni_mat4: " + Math.ceil(op.patch.cgl.profileData.profileMVPMatrixCount / fps) +
            " num glPrimitives: " + Math.ceil(op.patch.cgl.profileData.profileMeshNumElements / (fps)) +

            " fenced pixelread: " + Math.ceil(op.patch.cgl.profileData.profileFencedPixelRead) +

            " mesh.setGeom: " + op.patch.cgl.profileData.profileMeshSetGeom +
            " videos: " + op.patch.cgl.profileData.profileVideosPlaying +
            " tex preview: " + op.patch.cgl.profileData.profileTexPreviews;

        element.innerHTML +=
        " draw meshes: " + Math.ceil(op.patch.cgl.profileData.profileMeshDraw / fps) +
        " framebuffer blit: " + Math.ceil(op.patch.cgl.profileData.profileFramebuffer / fps) +
        " texeffect blit: " + Math.ceil(op.patch.cgl.profileData.profileTextureEffect / fps);

        element.innerHTML += " all shader compiletime: " + Math.round(op.patch.cgl.profileData.shaderCompileTime * 100) / 100;
    }

    op.patch.cgl.profileData.clear();
}

function styleMeasureEle(ele)
{
    ele.style.padding = "0px";
    ele.style.margin = "0px";
}

function addMeasureChild(m, parentEle, timeSum, level)
{
    const height = 20;
    m.usedAvg = (m.usedAvg || m.used);

    if (!m.ele || initMeasures)
    {
        const newEle = document.createElement("div");
        m.ele = newEle;

        if (m.childs && m.childs.length > 0) newEle.style.height = "500px";
        else newEle.style.height = height + "px";

        newEle.style.overflow = "hidden";
        newEle.style.display = "inline-block";

        if (!m.isRoot)
        {
            newEle.innerHTML = "<div style=\"min-height:" + height + "px;width:100%;overflow:hidden;color:black;position:relative\">&nbsp;" + m.name + "</div>";
            newEle.style["background-color"] = "rgb(" + m.colR + "," + m.colG + "," + m.colB + ")";
            newEle.style["border-left"] = "1px solid black";
        }

        parentEle.appendChild(newEle);
    }

    if (!m.isRoot)
    {
        if (performance.now() - m.lastTime > 200)
        {
            m.ele.style.display = "none";
            m.hidden = true;
        }
        else
        {
            if (m.hidden)
            {
                m.ele.style.display = "inline-block";
                m.hidden = false;
            }
        }

        m.ele.style.float = "left";
        m.ele.style.width = Math.floor((m.usedAvg / timeSum) * 98.0) + "%";
    }
    else
    {
        m.ele.style.width = "100%";
        m.ele.style.clear = "both";
        m.ele.style.float = "none";
    }

    if (m && m.childs && m.childs.length > 0)
    {
        let thisTimeSum = 0;
        for (var i = 0; i < m.childs.length; i++)
        {
            m.childs[i].usedAvg = (m.childs[i].usedAvg || m.childs[i].used) * 0.95 + m.childs[i].used * 0.05;
            thisTimeSum += m.childs[i].usedAvg;
        }
        for (var i = 0; i < m.childs.length; i++)
        {
            addMeasureChild(m.childs[i], m.ele, thisTimeSum, level + 1);
        }
    }
}

function clearMeasures(p)
{
    for (let i = 0; i < p.childs.length; i++) clearMeasures(p.childs[i]);
    p.childs.length = 0;
}

function measures()
{
    if (!CGL.performanceMeasures) return;

    if (!elementMeasures)
    {
        op.log("create measure ele");
        elementMeasures = document.createElement("div");
        elementMeasures.style.width = "100%";
        elementMeasures.style["background-color"] = "#444";
        elementMeasures.style.bottom = "10px";
        elementMeasures.style.height = "100px";
        elementMeasures.style.opacity = "1";
        elementMeasures.style.position = "absolute";
        elementMeasures.style["z-index"] = "99999";
        elementMeasures.innerHTML = "";
        container.appendChild(elementMeasures);
    }

    let timeSum = 0;
    const root = CGL.performanceMeasures[0];

    for (let i = 0; i < root.childs.length; i++) timeSum += root.childs[i].used;

    addMeasureChild(CGL.performanceMeasures[0], elementMeasures, timeSum, 0);

    root.childs.length = 0;

    clearMeasures(CGL.performanceMeasures[0]);

    CGL.performanceMeasures.length = 0;
    initMeasures = false;
}

exe.onTriggered = render;

function render()
{
    const selfTimeStart = performance.now();
    frameCount++;

    if (glQueryExt && inDoGpu.get() && inShow.get())op.patch.cgl.profileData.doProfileGlQuery = true;
    else op.patch.cgl.profileData.doProfileGlQuery = false;

    if (fpsStartTime === 0)fpsStartTime = Date.now();
    if (Date.now() - fpsStartTime >= 1000)
    {
        // query=null;
        fps = frameCount;
        frameCount = 0;
        // frames = 0;
        outFPS.set(fps);
        if (inShow.get())updateText();

        fpsStartTime = Date.now();
    }

    const glQueryData = op.patch.cgl.profileData.glQueryData;
    currentTimeGPU = 0;
    if (glQueryData)
    {
        let count = 0;
        for (let i in glQueryData)
        {
            count++;
            if (glQueryData[i].time)
                currentTimeGPU += glQueryData[i].time;
        }
    }

    if (inShow.get())
    {
        measures();

        if (opened && !op.patch.cgl.profileData.pause)
        {
            // const timeUsed = performance.now() - lastTime;
            queue.push(op.patch.cgl.profileData.profileFrameDelta);
            queue.shift();

            timesMainloop.push(childsTime);
            timesMainloop.shift();

            timesOnFrame.push(op.patch.cgl.profileData.profileOnAnimFrameOps - op.patch.cgl.profileData.profileMainloopMs);
            timesOnFrame.shift();

            timesGPU.push(currentTimeGPU);
            timesGPU.shift();

            updateCanvas();
        }
    }

    lastTime = performance.now();
    selfTime = performance.now() - selfTimeStart;
    const startTimeChilds = performance.now();

    outCanv.setRef(canvas);

    next.trigger();

    const nChildsTime = performance.now() - startTimeChilds;
    const nCurrentTimeMainloop = op.patch.cgl.profileData.profileMainloopMs;
    const nCurrentTimeOnFrame = op.patch.cgl.profileData.profileOnAnimFrameOps - op.patch.cgl.profileData.profileMainloopMs;

    if (smoothGraph.get())
    {
        childsTime = childsTime * 0.9 + nChildsTime * 0.1;
        currentTimeMainloop = currentTimeMainloop * 0.5 + nCurrentTimeMainloop * 0.5;
        currentTimeOnFrame = currentTimeOnFrame * 0.5 + nCurrentTimeOnFrame * 0.5;
    }
    else
    {
        childsTime = nChildsTime;
        currentTimeMainloop = nCurrentTimeMainloop;
        currentTimeOnFrame = nCurrentTimeOnFrame;
    }

    op.patch.cgl.profileData.clearGlQuery();
}


};

Ops.Gl.Performance.prototype = new CABLES.Op();
CABLES.OPS["9cd2d9de-000f-4a14-bd13-e7d5f057583c"]={f:Ops.Gl.Performance,objName:"Ops.Gl.Performance"};




// **************************************************************
// 
// Ops.Math.Floor
// 
// **************************************************************

Ops.Math.Floor = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const number1 = op.inValue("Number");
const result = op.outNumber("Result");
number1.onChange = exec;

function exec()
{
    result.set(Math.floor(number1.get()));
}


};

Ops.Math.Floor.prototype = new CABLES.Op();
CABLES.OPS["0c77617c-b688-4b55-addf-2cbcaabf98af"]={f:Ops.Math.Floor,objName:"Ops.Math.Floor"};




// **************************************************************
// 
// Ops.Trigger.Sequence
// 
// **************************************************************

Ops.Trigger.Sequence = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    exe = op.inTrigger("exe"),
    cleanup = op.inTriggerButton("Clean up connections");

op.setUiAttrib({ "resizable": true, "resizableY": false, "stretchPorts": true });
const
    exes = [],
    triggers = [],
    num = 16;

let
    updateTimeout = null,
    connectedOuts = [];

exe.onTriggered = triggerAll;
cleanup.onTriggered = clean;
cleanup.setUiAttribs({ "hideParam": true, "hidePort": true });

for (let i = 0; i < num; i++)
{
    const p = op.outTrigger("trigger " + i);
    triggers.push(p);
    p.onLinkChanged = updateButton;

    if (i < num - 1)
    {
        let newExe = op.inTrigger("exe " + i);
        newExe.onTriggered = triggerAll;
        exes.push(newExe);
    }
}

updateConnected();

function updateConnected()
{
    connectedOuts.length = 0;
    for (let i = 0; i < triggers.length; i++)
        if (triggers[i].links.length > 0) connectedOuts.push(triggers[i]);
}

function updateButton()
{
    updateConnected();
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() =>
    {
        let show = false;
        for (let i = 0; i < triggers.length; i++)
            if (triggers[i].links.length > 1) show = true;

        cleanup.setUiAttribs({ "hideParam": !show });

        if (op.isCurrentUiOp()) op.refreshParams();
    }, 60);
}

function triggerAll()
{
    // for (let i = 0; i < triggers.length; i++) triggers[i].trigger();
    for (let i = 0; i < connectedOuts.length; i++) connectedOuts[i].trigger();
}

function clean()
{
    let count = 0;
    for (let i = 0; i < triggers.length; i++)
    {
        let removeLinks = [];

        if (triggers[i].links.length > 1)
            for (let j = 1; j < triggers[i].links.length; j++)
            {
                while (triggers[count].links.length > 0) count++;

                removeLinks.push(triggers[i].links[j]);
                const otherPort = triggers[i].links[j].getOtherPort(triggers[i]);
                op.patch.link(op, "trigger " + count, otherPort.op, otherPort.name);
                count++;
            }

        for (let j = 0; j < removeLinks.length; j++) removeLinks[j].remove();
    }
    updateButton();
    updateConnected();
}


};

Ops.Trigger.Sequence.prototype = new CABLES.Op();
CABLES.OPS["a466bc1f-06e9-4595-8849-bffb9fe22f99"]={f:Ops.Trigger.Sequence,objName:"Ops.Trigger.Sequence"};




// **************************************************************
// 
// Ops.Gl.Meshes.Sphere_v2
// 
// **************************************************************

Ops.Gl.Meshes.Sphere_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    TAU = Math.PI * 2,
    cgl = op.patch.cgl,
    inTrigger = op.inTrigger("render"),
    inRadius = op.inValue("radius", 0.5),
    inStacks = op.inValue("stacks", 32),
    inSlices = op.inValue("slices", 32),
    inStacklimit = op.inValueSlider("Filloffset", 1),
    inDraw = op.inValueBool("Render", true),
    outTrigger = op.outTrigger("trigger"),
    outGeometry = op.outObject("geometry", null, "geometry"),
    UP = vec3.fromValues(0, 1, 0),
    RIGHT = vec3.fromValues(1, 0, 0);

let
    geom = new CGL.Geometry("Sphere"),
    tmpNormal = vec3.create(),
    tmpVec = vec3.create(),
    needsRebuild = true,
    mesh;

inTrigger.onTriggered = function ()
{
    if (needsRebuild) buildMesh();
    if (inDraw.get()) mesh.render(cgl.getShader());
    outTrigger.trigger();
};

inStacks.onChange =
inSlices.onChange =
inStacklimit.onChange =
inRadius.onChange = function ()
{
    // only calculate once, even after multiple settings could were changed
    needsRebuild = true;
};

// set lifecycle handlers
op.onDelete = function () { if (mesh)mesh.dispose(); };

function buildMesh()
{
    const
        stacks = Math.ceil(Math.max(inStacks.get(), 2)),
        slices = Math.ceil(Math.max(inSlices.get(), 3)),
        stackLimit = Math.min(Math.max(inStacklimit.get() * stacks, 1), stacks),
        radius = inRadius.get();
    let
        positions = [],
        texcoords = [],
        normals = [],
        tangents = [],
        biTangents = [],
        indices = [],
        x, y, z, d, t, a,
        o, u, v, i, j;
    for (i = o = 0; i < stacks + 1; i++)
    {
        v = (i / stacks - 0.5) * Math.PI;
        y = Math.sin(v);
        a = Math.cos(v);
        // for (j = 0; j < slices+1; j++) {
        for (j = slices; j >= 0; j--)
        {
            u = (j / slices) * TAU;
            x = Math.cos(u) * a;
            z = Math.sin(u) * a;

            positions.push(x * radius, y * radius, z * radius);
            // texcoords.push(i/(stacks+1),j/slices);
            texcoords.push(j / slices, i / (stacks + 1));

            d = Math.sqrt(x * x + y * y + z * z);
            normals.push(
                tmpNormal[0] = x / d,
                tmpNormal[1] = y / d,
                tmpNormal[2] = z / d
            );

            if (y == d) t = RIGHT;
            else t = UP;
            vec3.cross(tmpVec, tmpNormal, t);
            vec3.normalize(tmpVec, tmpVec);
            Array.prototype.push.apply(tangents, tmpVec);
            vec3.cross(tmpVec, tmpVec, tmpNormal);
            Array.prototype.push.apply(biTangents, tmpVec);
        }
        if (i == 0 || i > stackLimit) continue;
        for (j = 0; j < slices; j++, o++)
        {
            indices.push(
                o, o + 1, o + slices + 1,
                o + 1, o + slices + 2, o + slices + 1
            );
        }
        o++;
    }

    // set geometry
    geom.clear();
    geom.vertices = positions;
    geom.texCoords = texcoords;
    geom.vertexNormals = normals;
    geom.tangents = tangents;
    geom.biTangents = biTangents;
    geom.verticesIndices = indices;

    outGeometry.setRef(geom);

    if (!mesh) mesh = new CGL.Mesh(cgl, geom);
    else mesh.setGeom(geom);

    needsRebuild = false;
}


};

Ops.Gl.Meshes.Sphere_v2.prototype = new CABLES.Op();
CABLES.OPS["450b4d68-2278-4d9f-9849-0abdfa37ef69"]={f:Ops.Gl.Meshes.Sphere_v2,objName:"Ops.Gl.Meshes.Sphere_v2"};




// **************************************************************
// 
// Ops.Gl.ImageCompose.ImageCompose_v3
// 
// **************************************************************

Ops.Gl.ImageCompose.ImageCompose_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"imgcomp_frag":"IN vec2 texCoord;\nUNI vec4 bgColor;\nUNI sampler2D tex;\n#ifdef USE_UVTEX\nUNI sampler2D UVTex;\n#endif\n\nvoid main()\n{\n\n    #ifndef USE_TEX\n        outColor=bgColor;\n    #endif\n    #ifdef USE_TEX\n        #ifndef USE_UVTEX\n        outColor=texture(tex,texCoord);\n        #else\n        outColor=texture(tex,texture(UVTex,texCoord).xy);\n        #endif\n    #endif\n\n\n\n}\n",};
const
    cgl = op.patch.cgl,
    render = op.inTrigger("Render"),
    inTex = op.inTexture("Base Texture"),
    inUVTex = op.inTexture("UV Texture"),
    inSize = op.inSwitch("Size", ["Auto", "Manual"], "Auto"),
    width = op.inValueInt("Width", 640),
    height = op.inValueInt("Height", 480),
    inFilter = op.inSwitch("Filter", ["nearest", "linear", "mipmap"], "linear"),
    inWrap = op.inValueSelect("Wrap", ["clamp to edge", "repeat", "mirrored repeat"], "repeat"),
    inPixel = op.inDropDown("Pixel Format", CGL.Texture.PIXELFORMATS, CGL.Texture.PFORMATSTR_RGBA8UB),

    r = op.inValueSlider("R", 0),
    g = op.inValueSlider("G", 0),
    b = op.inValueSlider("B", 0),
    a = op.inValueSlider("A", 0),

    trigger = op.outTrigger("Next"),
    texOut = op.outTexture("texture_out", CGL.Texture.getEmptyTexture(cgl)),
    outRatio = op.outNumber("Aspect Ratio"),
    outWidth = op.outNumber("Texture Width"),
    outHeight = op.outNumber("Texture Height");

op.setPortGroup("Texture Size", [inSize, width, height]);
op.setPortGroup("Texture Parameters", [inWrap, inFilter, inPixel]);

r.setUiAttribs({ "colorPick": true });
op.setPortGroup("Color", [r, g, b, a]);

op.toWorkPortsNeedToBeLinked(render);

const prevViewPort = [0, 0, 0, 0];
let effect = null;
let tex = null;
let reInitEffect = true;
let isFloatTex = false;
let copyShader = null;
let copyShaderTexUni = null;
let copyShaderUVTexUni = null;
let copyShaderRGBAUni = null;

inWrap.onChange =
    inFilter.onChange =
    inPixel.onChange = reInitLater;

inTex.onLinkChanged =
inSize.onChange =
inUVTex.onChange = updateUi;

render.onTriggered =
    op.preRender = doRender;

updateUi();

function initEffect()
{
    if (effect)effect.delete();
    if (tex)tex.delete();

    effect = new CGL.TextureEffect(cgl, { "isFloatingPointTexture": CGL.Texture.isPixelFormatFloat(inPixel.get()) });

    tex = new CGL.Texture(cgl,
        {
            "name": "image_compose_v2_" + op.id,
            "isFloatingPointTexture": CGL.Texture.isPixelFormatFloat(inPixel.get()),
            "pixelFormat": inPixel.get(),
            "filter": getFilter(),
            "wrap": getWrap(),
            "width": getWidth(),
            "height": getHeight()
        });

    effect.setSourceTexture(tex);

    outWidth.set(getWidth());
    outHeight.set(getHeight());
    outRatio.set(getWidth() / getHeight());

    texOut.set(CGL.Texture.getEmptyTexture(cgl));

    reInitEffect = false;
    updateUi();
}

function getFilter()
{
    if (inFilter.get() == "nearest") return CGL.Texture.FILTER_NEAREST;
    else if (inFilter.get() == "linear") return CGL.Texture.FILTER_LINEAR;
    else if (inFilter.get() == "mipmap") return CGL.Texture.FILTER_MIPMAP;
}

function getWrap()
{
    if (inWrap.get() == "repeat") return CGL.Texture.WRAP_REPEAT;
    else if (inWrap.get() == "mirrored repeat") return CGL.Texture.WRAP_MIRRORED_REPEAT;
    else if (inWrap.get() == "clamp to edge") return CGL.Texture.WRAP_CLAMP_TO_EDGE;
}

function getWidth()
{
    if (inTex.get() && inSize.get() == "Auto") return inTex.get().width;
    if (inSize.get() == "Auto") return cgl.getViewPort()[2];
    return Math.ceil(width.get());
}

function getHeight()
{
    if (inTex.get() && inSize.get() == "Auto") return inTex.get().height;
    else if (inSize.get() == "Auto") return cgl.getViewPort()[3];
    else return Math.ceil(height.get());
}

function reInitLater()
{
    reInitEffect = true;
}

function updateResolution()
{
    if ((
        getWidth() != tex.width ||
        getHeight() != tex.height ||
        // tex.isFloatingPoint() != CGL.Texture.isPixelFormatFloat(inPixel.get()) ||
        tex.pixelFormat != inPixel.get() ||
        tex.filter != getFilter() ||
        tex.wrap != getWrap()
    ) && (getWidth() !== 0 && getHeight() !== 0))
    {
        initEffect();
        effect.setSourceTexture(tex);
        texOut.set(CGL.Texture.getEmptyTexture(cgl));
        texOut.set(tex);
        updateResolutionInfo();
        checkTypes();
    }
}

function updateResolutionInfo()
{
    let info = null;

    if (inSize.get() == "Manual")
    {
        info = null;
    }
    else if (inSize.get() == "Auto")
    {
        if (inTex.get()) info = "Input Texture";
        else info = "Canvas Size";

        info += ": " + getWidth() + " x " + getHeight();
    }

    let changed = false;
    changed = inSize.uiAttribs.info != info;
    inSize.setUiAttribs({ "info": info });
    if (changed)op.refreshParams();
}

function updateDefines()
{
    if (copyShader)copyShader.toggleDefine("USE_TEX", inTex.isLinked());
    if (copyShader)copyShader.toggleDefine("USE_UVTEX", inUVTex.isLinked());
}

function updateUi()
{
    r.setUiAttribs({ "greyout": inTex.isLinked() });
    b.setUiAttribs({ "greyout": inTex.isLinked() });
    g.setUiAttribs({ "greyout": inTex.isLinked() });
    a.setUiAttribs({ "greyout": inTex.isLinked() });

    width.setUiAttribs({ "greyout": inSize.get() == "Auto" });
    height.setUiAttribs({ "greyout": inSize.get() == "Auto" });

    width.setUiAttribs({ "hideParam": inSize.get() != "Manual" });
    height.setUiAttribs({ "hideParam": inSize.get() != "Manual" });

    if (tex)
        if (CGL.Texture.isPixelFormatFloat(inPixel.get()) && getFilter() == CGL.Texture.FILTER_MIPMAP) op.setUiError("fpmipmap", "Don't use mipmap and 32bit at the same time, many systems do not support this.");
        else op.setUiError("fpmipmap", null);

    updateResolutionInfo();
    updateDefines();
    checkTypes();
}

function checkTypes()
{
    if (tex)
        if (inTex.isLinked() && inTex.get() && tex.textureType != inTex.get().textureType && (tex.textureType != CGL.Texture.TYPE_FLOAT || inTex.get().textureType == CGL.Texture.TYPE_FLOAT))
            op.setUiError("textypediff", "Drawing 32bit texture into an 8 bit can result in data/precision loss", 1);
        else
            op.setUiError("textypediff", null);
}

op.preRender = () =>
{
    doRender();
};

function copyTexture()
{
    if (!copyShader)
    {
        copyShader = new CGL.Shader(cgl, "copytextureshader");
        copyShader.setSource(copyShader.getDefaultVertexShader(), attachments.imgcomp_frag);
        copyShaderTexUni = new CGL.Uniform(copyShader, "t", "tex", 0);
        copyShaderUVTexUni = new CGL.Uniform(copyShader, "t", "UVTex", 1);
        copyShaderRGBAUni = new CGL.Uniform(copyShader, "4f", "bgColor", r, g, b, a);
        updateDefines();
    }

    cgl.pushShader(copyShader);
    cgl.currentTextureEffect.bind();

    if (inTex.get()) cgl.setTexture(0, inTex.get().tex);
    if (inUVTex.get()) cgl.setTexture(1, inUVTex.get().tex);

    cgl.currentTextureEffect.finish();
    cgl.popShader();
}

function doRender()
{
    if (!effect || reInitEffect) initEffect();

    const vp = cgl.getViewPort();
    prevViewPort[0] = vp[0];
    prevViewPort[1] = vp[1];
    prevViewPort[2] = vp[2];
    prevViewPort[3] = vp[3];

    cgl.pushBlend(false);

    updateResolution();

    const oldEffect = cgl.currentTextureEffect;
    cgl.currentTextureEffect = effect;
    cgl.currentTextureEffect.imgCompVer = 3;
    cgl.currentTextureEffect.width = width.get();
    cgl.currentTextureEffect.height = height.get();
    effect.setSourceTexture(tex);

    effect.startEffect(inTex.get() || CGL.Texture.getEmptyTexture(cgl, isFloatTex), true);
    copyTexture();

    trigger.trigger();

    // texOut.set(CGL.Texture.getEmptyTexture(cgl));

    texOut.setRef(effect.getCurrentSourceTexture());

    effect.endEffect();
    // console.log(prevViewPort);

    cgl.setViewPort(prevViewPort[0], prevViewPort[1], prevViewPort[2], prevViewPort[3]);

    cgl.popBlend(false);
    cgl.currentTextureEffect = oldEffect;
}


};

Ops.Gl.ImageCompose.ImageCompose_v3.prototype = new CABLES.Op();
CABLES.OPS["e890a050-11b7-456e-b09b-d08cd9c1ee41"]={f:Ops.Gl.ImageCompose.ImageCompose_v3,objName:"Ops.Gl.ImageCompose.ImageCompose_v3"};




// **************************************************************
// 
// Ops.Gl.ImageCompose.Noise.FBMNoise_v2
// 
// **************************************************************

Ops.Gl.ImageCompose.Noise.FBMNoise_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"fbmnoise_frag":"UNI sampler2D tex;\nUNI float anim;\n\nUNI float scale;\nUNI float repeat;\n\nUNI float scrollX;\nUNI float scrollY;\n\nUNI float amount;\n\nUNI bool layer1;\nUNI bool layer2;\nUNI bool layer3;\nUNI bool layer4;\nUNI vec3 color;\nUNI float aspect;\n\nIN vec2 texCoord;\n\n\n{{CGL.BLENDMODES3}}\n\n// adapted from warp shader by inigo quilez/iq\n// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.\n\n// See here for a tutorial on how to make this: http://www.iquilezles.org/www/articles/warp/warp.htm\n\nconst mat2 m = mat2( 0.80,  0.60, -0.60,  0.80 );\n\nfloat noise( in vec2 x )\n{\n\treturn sin(1.5*x.x)*sin(1.5*x.y);\n}\n\nfloat fbm4( vec2 p )\n{\n    float f = 0.0;\n    f += 0.5000*noise( p ); p = m*p*2.02;\n    f += 0.2500*noise( p ); p = m*p*2.03;\n    f += 0.1250*noise( p ); p = m*p*2.01;\n    f += 0.0625*noise( p );\n    return f/0.9375;\n}\n\nfloat fbm6( vec2 p )\n{\n    float f = 0.0;\n    f += 0.500000*(0.5+0.5*noise( p )); p = m*p*2.02;\n    f += 0.250000*(0.5+0.5*noise( p )); p = m*p*2.03;\n    f += 0.125000*(0.5+0.5*noise( p )); p = m*p*2.01;\n    f += 0.062500*(0.5+0.5*noise( p )); p = m*p*2.04;\n    f += 0.031250*(0.5+0.5*noise( p )); p = m*p*2.01;\n    f += 0.015625*(0.5+0.5*noise( p ));\n    return f/0.96875;\n}\n\nvoid main()\n{\n    vec2 tc=texCoord;\n\t#ifdef DO_TILEABLE\n\t    tc=abs(texCoord-0.5);\n\t#endif\n\n    vec2 p=(tc-0.5)*scale;\n\n    p.y/=aspect;\n    vec2 q = vec2( fbm4( p + vec2(0.3+scrollX,0.20+scrollY) ),\n                   fbm4( p + vec2(3.1+scrollX,1.3+scrollY) ) );\n\n    vec2 q2 = vec2( fbm4( p + vec2(2.0+scrollX,1.0+scrollY) ),\n                   fbm4( p + vec2(3.1+scrollX,1.3+scrollY) ) );\n\n    vec2 q3 = vec2( fbm4( p + vec2(9.0+scrollX,4.0+scrollY) ),\n                   fbm4( p + vec2(3.1+scrollX,4.3+scrollY) ) );\n\n    float v= fbm4( ( p + 4.0*q +anim*0.1)*repeat);\n    float v2= fbm4( (p + 4.0*q2 +anim*0.1)*repeat );\n\n    float v3= fbm6( (p + 4.0*q3 +anim*0.1)*repeat );\n    float v4= fbm6( (p + 4.0*q2 +anim*0.1)*repeat );\n\n    vec4 base=texture(tex,texCoord);\n\n    vec4 finalColor;\n    float colVal=0.0;\n    float numLayers=0.0;\n\n    if(layer1)\n    {\n        colVal+=v;\n        numLayers++;\n    }\n\n    if(layer2)\n    {\n        colVal+=v2;\n        numLayers++;\n    }\n\n    if(layer3)\n    {\n        colVal+=v3;\n        numLayers++;\n    }\n\n    if(layer4)\n    {\n        colVal+=v4;\n        numLayers++;\n    }\n\n    finalColor=vec4( color*vec3(colVal/numLayers),1.0);\n\n    outColor = cgl_blendPixel(base,finalColor,amount);\n}\n",};
const
    render = op.inTrigger("render"),
    blendMode = CGL.TextureEffect.AddBlendSelect(op, "Blend Mode", "normal"),
    amount = op.inValueSlider("Amount", 1),
    maskAlpha = CGL.TextureEffect.AddBlendAlphaMask(op),
    r = op.inValueSlider("r", 1.0),
    g = op.inValueSlider("g", 1.0),
    b = op.inValueSlider("b", 1.0),
    trigger = op.outTrigger("trigger");

r.setUiAttribs({ "colorPick": true });

const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl, "fbmnoise");

shader.setSource(shader.getDefaultVertexShader(), attachments.fbmnoise_frag);

const
    textureUniform = new CGL.Uniform(shader, "t", "tex", 0),
    uniScale = new CGL.Uniform(shader, "f", "scale", op.inValue("scale", 2)),
    uniAnim = new CGL.Uniform(shader, "f", "anim", op.inValue("anim", 0)),
    uniScrollX = new CGL.Uniform(shader, "f", "scrollX", op.inValue("scrollX", 9)),
    uniScrollY = new CGL.Uniform(shader, "f", "scrollY", op.inValue("scrollY", 0)),
    uniRepeat = new CGL.Uniform(shader, "f", "repeat", op.inValue("repeat", 1)),
    uniAspect = new CGL.Uniform(shader, "f", "aspect", op.inValue("aspect", 1)),
    uniLayer1 = new CGL.Uniform(shader, "b", "layer1", op.inValueBool("Layer 1", true)),
    uniLayer2 = new CGL.Uniform(shader, "b", "layer2", op.inValueBool("Layer 2", true)),
    uniLayer3 = new CGL.Uniform(shader, "b", "layer3", op.inValueBool("Layer 3", true)),
    uniLayer4 = new CGL.Uniform(shader, "b", "layer4", op.inValueBool("Layer 4", true)),
    uniColor = new CGL.Uniform(shader, "3f", "color", r, g, b),
    amountUniform = new CGL.Uniform(shader, "f", "amount", amount);

const tile = op.inValueBool("Tileable", false);
tile.onChange = updateTileable;

CGL.TextureEffect.setupBlending(op, shader, blendMode, amount, maskAlpha);

function updateTileable()
{
    shader.toggleDefine("DO_TILEABLE", tile.get());
}

render.onTriggered = function ()
{
    if (!CGL.TextureEffect.checkOpInEffect(op)) return;

    cgl.pushShader(shader);
    cgl.currentTextureEffect.bind();

    uniAspect.set(cgl.currentTextureEffect.getCurrentSourceTexture().width / cgl.currentTextureEffect.getCurrentSourceTexture().height);

    cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);

    cgl.currentTextureEffect.finish();
    cgl.popShader();

    trigger.trigger();
};


};

Ops.Gl.ImageCompose.Noise.FBMNoise_v2.prototype = new CABLES.Op();
CABLES.OPS["9422eeab-b6c5-47d1-8737-d5c43dc137a3"]={f:Ops.Gl.ImageCompose.Noise.FBMNoise_v2,objName:"Ops.Gl.ImageCompose.Noise.FBMNoise_v2"};




// **************************************************************
// 
// Ops.Gl.Shader.BasicMaterial_v3
// 
// **************************************************************

Ops.Gl.Shader.BasicMaterial_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"basicmaterial_frag":"{{MODULES_HEAD}}\n\nIN vec2 texCoord;\n\n#ifdef VERTEX_COLORS\nIN vec4 vertCol;\n#endif\n\n#ifdef HAS_TEXTURES\n    IN vec2 texCoordOrig;\n    #ifdef HAS_TEXTURE_DIFFUSE\n        UNI sampler2D tex;\n    #endif\n    #ifdef HAS_TEXTURE_OPACITY\n        UNI sampler2D texOpacity;\n   #endif\n#endif\n\n\n\nvoid main()\n{\n    {{MODULE_BEGIN_FRAG}}\n    vec4 col=color;\n\n\n    #ifdef HAS_TEXTURES\n        vec2 uv=texCoord;\n\n        #ifdef CROP_TEXCOORDS\n            if(uv.x<0.0 || uv.x>1.0 || uv.y<0.0 || uv.y>1.0) discard;\n        #endif\n\n        #ifdef HAS_TEXTURE_DIFFUSE\n            col=texture(tex,uv);\n\n            #ifdef COLORIZE_TEXTURE\n                col.r*=color.r;\n                col.g*=color.g;\n                col.b*=color.b;\n            #endif\n        #endif\n        col.a*=color.a;\n        #ifdef HAS_TEXTURE_OPACITY\n            #ifdef TRANSFORMALPHATEXCOORDS\n                uv=texCoordOrig;\n            #endif\n            #ifdef ALPHA_MASK_IR\n                col.a*=1.0-texture(texOpacity,uv).r;\n            #endif\n            #ifdef ALPHA_MASK_IALPHA\n                col.a*=1.0-texture(texOpacity,uv).a;\n            #endif\n            #ifdef ALPHA_MASK_ALPHA\n                col.a*=texture(texOpacity,uv).a;\n            #endif\n            #ifdef ALPHA_MASK_LUMI\n                col.a*=dot(vec3(0.2126,0.7152,0.0722), texture(texOpacity,uv).rgb);\n            #endif\n            #ifdef ALPHA_MASK_R\n                col.a*=texture(texOpacity,uv).r;\n            #endif\n            #ifdef ALPHA_MASK_G\n                col.a*=texture(texOpacity,uv).g;\n            #endif\n            #ifdef ALPHA_MASK_B\n                col.a*=texture(texOpacity,uv).b;\n            #endif\n            // #endif\n        #endif\n    #endif\n\n    {{MODULE_COLOR}}\n\n    #ifdef DISCARDTRANS\n        if(col.a<0.2) discard;\n    #endif\n\n    #ifdef VERTEX_COLORS\n        col*=vertCol;\n    #endif\n\n    outColor = col;\n}\n","basicmaterial_vert":"\n{{MODULES_HEAD}}\n\nOUT vec2 texCoord;\nOUT vec2 texCoordOrig;\n\nUNI mat4 projMatrix;\nUNI mat4 modelMatrix;\nUNI mat4 viewMatrix;\n\n#ifdef HAS_TEXTURES\n    UNI float diffuseRepeatX;\n    UNI float diffuseRepeatY;\n    UNI float texOffsetX;\n    UNI float texOffsetY;\n#endif\n\n#ifdef VERTEX_COLORS\n    in vec4 attrVertColor;\n    out vec4 vertCol;\n\n#endif\n\n\nvoid main()\n{\n    mat4 mMatrix=modelMatrix;\n    mat4 modelViewMatrix;\n\n    norm=attrVertNormal;\n    texCoordOrig=attrTexCoord;\n    texCoord=attrTexCoord;\n    #ifdef HAS_TEXTURES\n        texCoord.x=texCoord.x*diffuseRepeatX+texOffsetX;\n        texCoord.y=(1.0-texCoord.y)*diffuseRepeatY+texOffsetY;\n    #endif\n\n    #ifdef VERTEX_COLORS\n        vertCol=attrVertColor;\n    #endif\n\n    vec4 pos = vec4(vPosition, 1.0);\n\n    #ifdef BILLBOARD\n       vec3 position=vPosition;\n       modelViewMatrix=viewMatrix*modelMatrix;\n\n       gl_Position = projMatrix * modelViewMatrix * vec4((\n           position.x * vec3(\n               modelViewMatrix[0][0],\n               modelViewMatrix[1][0],\n               modelViewMatrix[2][0] ) +\n           position.y * vec3(\n               modelViewMatrix[0][1],\n               modelViewMatrix[1][1],\n               modelViewMatrix[2][1]) ), 1.0);\n    #endif\n\n    {{MODULE_VERTEX_POSITION}}\n\n    #ifndef BILLBOARD\n        modelViewMatrix=viewMatrix * mMatrix;\n\n        {{MODULE_VERTEX_MOVELVIEW}}\n\n    #endif\n\n    // mat4 modelViewMatrix=viewMatrix*mMatrix;\n\n    #ifndef BILLBOARD\n        // gl_Position = projMatrix * viewMatrix * modelMatrix * pos;\n        gl_Position = projMatrix * modelViewMatrix * pos;\n    #endif\n}\n",};
const render = op.inTrigger("render");
const trigger = op.outTrigger("trigger");
const shaderOut = op.outObject("shader", null, "shader");

shaderOut.ignoreValueSerialize = true;

op.toWorkPortsNeedToBeLinked(render);
op.toWorkShouldNotBeChild("Ops.Gl.TextureEffects.ImageCompose", CABLES.OP_PORT_TYPE_FUNCTION);

const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl, "basicmaterialnew", this);
shader.addAttribute({ "type": "vec3", "name": "vPosition" });
shader.addAttribute({ "type": "vec2", "name": "attrTexCoord" });
shader.addAttribute({ "type": "vec3", "name": "attrVertNormal", "nameFrag": "norm" });
shader.addAttribute({ "type": "float", "name": "attrVertIndex" });

shader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG", "MODULE_VERTEX_MOVELVIEW"]);

shader.setSource(attachments.basicmaterial_vert, attachments.basicmaterial_frag);

shaderOut.setRef(shader);

render.onTriggered = doRender;

// rgba colors
const r = op.inValueSlider("r", Math.random());
const g = op.inValueSlider("g", Math.random());
const b = op.inValueSlider("b", Math.random());
const a = op.inValueSlider("a", 1);
r.setUiAttribs({ "colorPick": true });

// const uniColor=new CGL.Uniform(shader,'4f','color',r,g,b,a);
const colUni = shader.addUniformFrag("4f", "color", r, g, b, a);

shader.uniformColorDiffuse = colUni;

// diffuse outTexture

const diffuseTexture = op.inTexture("texture");
let diffuseTextureUniform = null;
diffuseTexture.onChange = updateDiffuseTexture;

const colorizeTexture = op.inValueBool("colorizeTexture", false);
const vertexColors = op.inValueBool("Vertex Colors", false);

// opacity texture
const textureOpacity = op.inTexture("textureOpacity");
let textureOpacityUniform = null;

const alphaMaskSource = op.inSwitch("Alpha Mask Source", ["Luminance", "R", "G", "B", "A", "1-A", "1-R"], "Luminance");
alphaMaskSource.setUiAttribs({ "greyout": true });
textureOpacity.onChange = updateOpacity;

const texCoordAlpha = op.inValueBool("Opacity TexCoords Transform", false);
const discardTransPxl = op.inValueBool("Discard Transparent Pixels");

// texture coords
const
    diffuseRepeatX = op.inValue("diffuseRepeatX", 1),
    diffuseRepeatY = op.inValue("diffuseRepeatY", 1),
    diffuseOffsetX = op.inValue("Tex Offset X", 0),
    diffuseOffsetY = op.inValue("Tex Offset Y", 0),
    cropRepeat = op.inBool("Crop TexCoords", false);

shader.addUniformFrag("f", "diffuseRepeatX", diffuseRepeatX);
shader.addUniformFrag("f", "diffuseRepeatY", diffuseRepeatY);
shader.addUniformFrag("f", "texOffsetX", diffuseOffsetX);
shader.addUniformFrag("f", "texOffsetY", diffuseOffsetY);

const doBillboard = op.inValueBool("billboard", false);

alphaMaskSource.onChange =
    doBillboard.onChange =
    discardTransPxl.onChange =
    texCoordAlpha.onChange =
    cropRepeat.onChange =
    vertexColors.onChange =
    colorizeTexture.onChange = updateDefines;

op.setPortGroup("Color", [r, g, b, a]);
op.setPortGroup("Color Texture", [diffuseTexture, vertexColors, colorizeTexture]);
op.setPortGroup("Opacity", [textureOpacity, alphaMaskSource, discardTransPxl, texCoordAlpha]);
op.setPortGroup("Texture Transform", [diffuseRepeatX, diffuseRepeatY, diffuseOffsetX, diffuseOffsetY, cropRepeat]);

updateOpacity();
updateDiffuseTexture();

op.preRender = function ()
{
    shader.bind();
    doRender();
};

function doRender()
{
    if (!shader) return;

    cgl.pushShader(shader);
    shader.popTextures();

    if (diffuseTextureUniform && diffuseTexture.get()) shader.pushTexture(diffuseTextureUniform, diffuseTexture.get());
    if (textureOpacityUniform && textureOpacity.get()) shader.pushTexture(textureOpacityUniform, textureOpacity.get());

    trigger.trigger();

    cgl.popShader();
}

function updateOpacity()
{
    if (textureOpacity.get())
    {
        if (textureOpacityUniform !== null) return;
        shader.removeUniform("texOpacity");
        shader.define("HAS_TEXTURE_OPACITY");
        if (!textureOpacityUniform)textureOpacityUniform = new CGL.Uniform(shader, "t", "texOpacity");
    }
    else
    {
        shader.removeUniform("texOpacity");
        shader.removeDefine("HAS_TEXTURE_OPACITY");
        textureOpacityUniform = null;
    }

    updateDefines();
}

function updateDiffuseTexture()
{
    if (diffuseTexture.get())
    {
        if (!shader.hasDefine("HAS_TEXTURE_DIFFUSE"))shader.define("HAS_TEXTURE_DIFFUSE");
        if (!diffuseTextureUniform)diffuseTextureUniform = new CGL.Uniform(shader, "t", "texDiffuse");
    }
    else
    {
        shader.removeUniform("texDiffuse");
        shader.removeDefine("HAS_TEXTURE_DIFFUSE");
        diffuseTextureUniform = null;
    }
    updateUi();
}

function updateUi()
{
    const hasTexture = diffuseTexture.isLinked() || textureOpacity.isLinked();
    diffuseRepeatX.setUiAttribs({ "greyout": !hasTexture });
    diffuseRepeatY.setUiAttribs({ "greyout": !hasTexture });
    diffuseOffsetX.setUiAttribs({ "greyout": !hasTexture });
    diffuseOffsetY.setUiAttribs({ "greyout": !hasTexture });
    colorizeTexture.setUiAttribs({ "greyout": !hasTexture });

    alphaMaskSource.setUiAttribs({ "greyout": !textureOpacity.get() });
    texCoordAlpha.setUiAttribs({ "greyout": !textureOpacity.get() });

    let notUsingColor = true;
    notUsingColor = diffuseTexture.get() && !colorizeTexture.get();
    r.setUiAttribs({ "greyout": notUsingColor });
    g.setUiAttribs({ "greyout": notUsingColor });
    b.setUiAttribs({ "greyout": notUsingColor });
}

function updateDefines()
{
    shader.toggleDefine("VERTEX_COLORS", vertexColors.get());
    shader.toggleDefine("CROP_TEXCOORDS", cropRepeat.get());
    shader.toggleDefine("COLORIZE_TEXTURE", colorizeTexture.get());
    shader.toggleDefine("TRANSFORMALPHATEXCOORDS", texCoordAlpha.get());
    shader.toggleDefine("DISCARDTRANS", discardTransPxl.get());
    shader.toggleDefine("BILLBOARD", doBillboard.get());

    shader.toggleDefine("ALPHA_MASK_ALPHA", alphaMaskSource.get() == "A");
    shader.toggleDefine("ALPHA_MASK_IALPHA", alphaMaskSource.get() == "1-A");
    shader.toggleDefine("ALPHA_MASK_IR", alphaMaskSource.get() == "1-R");
    shader.toggleDefine("ALPHA_MASK_LUMI", alphaMaskSource.get() == "Luminance");
    shader.toggleDefine("ALPHA_MASK_R", alphaMaskSource.get() == "R");
    shader.toggleDefine("ALPHA_MASK_G", alphaMaskSource.get() == "G");
    shader.toggleDefine("ALPHA_MASK_B", alphaMaskSource.get() == "B");
    updateUi();
}


};

Ops.Gl.Shader.BasicMaterial_v3.prototype = new CABLES.Op();
CABLES.OPS["ec55d252-3843-41b1-b731-0482dbd9e72b"]={f:Ops.Gl.Shader.BasicMaterial_v3,objName:"Ops.Gl.Shader.BasicMaterial_v3"};




// **************************************************************
// 
// Ops.Gl.RenderToTexture
// 
// **************************************************************

Ops.Gl.RenderToTexture = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const cgl = op.patch.cgl;

const
    render = op.inTrigger("render"),
    useVPSize = op.inValueBool("use viewport size", true),
    width = op.inValueInt("texture width", 512),
    height = op.inValueInt("texture height", 512),
    aspect = op.inBool("Auto Aspect", false),
    tfilter = op.inSwitch("filter", ["nearest", "linear", "mipmap"], "linear"),
    twrap = op.inSwitch("Wrap", ["Clamp", "Repeat", "Mirror"], "Repeat"),
    msaa = op.inSwitch("MSAA", ["none", "2x", "4x", "8x"], "none"),
    trigger = op.outTrigger("trigger"),
    tex = op.outTexture("texture"),
    texDepth = op.outTexture("textureDepth"),
    fpTexture = op.inValueBool("HDR"),
    depth = op.inValueBool("Depth", true),
    clear = op.inValueBool("Clear", true);

let fb = null;
let reInitFb = true;
tex.set(CGL.Texture.getEmptyTexture(cgl));

op.setPortGroup("Size", [useVPSize, width, height, aspect]);

const prevViewPort = [0, 0, 0, 0];

fpTexture.setUiAttribs({ "title": "Pixelformat Float 32bit" });

fpTexture.onChange =
    depth.onChange =
    clear.onChange =
    tfilter.onChange =
    twrap.onChange =
    msaa.onChange = initFbLater;

useVPSize.onChange = updateVpSize;

render.onTriggered =
    op.preRender = doRender;

updateVpSize();

function updateVpSize()
{
    width.setUiAttribs({ "greyout": useVPSize.get() });
    height.setUiAttribs({ "greyout": useVPSize.get() });
    aspect.setUiAttribs({ "greyout": useVPSize.get() });
}

function initFbLater()
{
    reInitFb = true;
}

function doRender()
{
    const vp = cgl.getViewPort();
    prevViewPort[0] = vp[0];
    prevViewPort[1] = vp[1];
    prevViewPort[2] = vp[2];
    prevViewPort[3] = vp[3];

    if (!fb || reInitFb)
    {
        if (fb) fb.delete();

        let selectedWrap = CGL.Texture.WRAP_REPEAT;
        if (twrap.get() == "Clamp") selectedWrap = CGL.Texture.WRAP_CLAMP_TO_EDGE;
        else if (twrap.get() == "Mirror") selectedWrap = CGL.Texture.WRAP_MIRRORED_REPEAT;

        let selectFilter = CGL.Texture.FILTER_NEAREST;
        if (tfilter.get() == "nearest") selectFilter = CGL.Texture.FILTER_NEAREST;
        else if (tfilter.get() == "linear") selectFilter = CGL.Texture.FILTER_LINEAR;
        else if (tfilter.get() == "mipmap") selectFilter = CGL.Texture.FILTER_MIPMAP;

        if (fpTexture.get() && tfilter.get() == "mipmap") op.setUiError("fpmipmap", "Don't use mipmap and HDR at the same time, many systems do not support this.");
        else op.setUiError("fpmipmap", null);

        if (cgl.glVersion >= 2)
        {
            let ms = true;
            let msSamples = 4;

            if (msaa.get() == "none")
            {
                msSamples = 0;
                ms = false;
            }
            if (msaa.get() == "2x") msSamples = 2;
            if (msaa.get() == "4x") msSamples = 4;
            if (msaa.get() == "8x") msSamples = 8;

            fb = new CGL.Framebuffer2(cgl, 8, 8,
                {
                    "name": "render2texture " + op.id,
                    "isFloatingPointTexture": fpTexture.get(),
                    "multisampling": ms,
                    "wrap": selectedWrap,
                    "filter": selectFilter,
                    "depth": depth.get(),
                    "multisamplingSamples": msSamples,
                    "clear": clear.get()
                });
        }
        else
        {
            fb = new CGL.Framebuffer(cgl, 8, 8, { "isFloatingPointTexture": fpTexture.get(), "clear": clear.get() });
            console.log("WEBGL1!!!", fb, fb.valid);
        }

        if (fb && fb.valid)
        {
            texDepth.set(fb.getTextureDepth());
            reInitFb = false;
        }
        else
        {
            fb = null;
            reInitFb = true;
        }
    }

    if (useVPSize.get())
    {
        width.set(cgl.getViewPort()[2]);
        height.set(cgl.getViewPort()[3]);
    }

    if (fb.getWidth() != Math.ceil(width.get()) || fb.getHeight() != Math.ceil(height.get()))
    {
        fb.setSize(
            Math.max(1, Math.ceil(width.get())),
            Math.max(1, Math.ceil(height.get())));
    }

    fb.renderStart(cgl);

    if (aspect.get()) mat4.perspective(cgl.pMatrix, 45, width.get() / height.get(), 0.1, 1000.0);

    trigger.trigger();
    fb.renderEnd(cgl);

    // cgl.resetViewPort();
    cgl.setViewPort(prevViewPort[0], prevViewPort[1], prevViewPort[2], prevViewPort[3]);

    // texDepth.set(CGL.Texture.getEmptyTexture(op.patch.cgl));
    texDepth.setRef(fb.getTextureDepth());

    // tex.set(CGL.Texture.getEmptyTexture(op.patch.cgl));
    tex.setRef(fb.getTextureColor());
}


};

Ops.Gl.RenderToTexture.prototype = new CABLES.Op();
CABLES.OPS["d01fa820-396c-4cb5-9d78-6b14762852af"]={f:Ops.Gl.RenderToTexture,objName:"Ops.Gl.RenderToTexture"};




// **************************************************************
// 
// Ops.Gl.ImageCompose.DrawImage_v3
// 
// **************************************************************

Ops.Gl.ImageCompose.DrawImage_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"drawimage_frag":"#ifdef HAS_TEXTURES\n    IN vec2 texCoord;\n    UNI sampler2D tex;\n    UNI sampler2D image;\n#endif\n\n#ifdef TEX_TRANSFORM\n    IN mat3 transform;\n#endif\n// UNI float rotate;\n\n{{CGL.BLENDMODES}}\n\n#ifdef HAS_TEXTUREALPHA\n   UNI sampler2D imageAlpha;\n#endif\n\nUNI float amount;\n\n#ifdef ASPECT_RATIO\n    UNI float aspectTex;\n    UNI float aspectPos;\n#endif\n\nvoid main()\n{\n    vec4 blendRGBA=vec4(0.0,0.0,0.0,1.0);\n\n    #ifdef HAS_TEXTURES\n        vec2 tc=texCoord;\n\n        #ifdef TEX_FLIP_X\n            tc.x=1.0-tc.x;\n        #endif\n        #ifdef TEX_FLIP_Y\n            tc.y=1.0-tc.y;\n        #endif\n\n        #ifdef ASPECT_RATIO\n            #ifdef ASPECT_AXIS_X\n                tc.y=(1.0-aspectPos)-(((1.0-aspectPos)-tc.y)*aspectTex);\n            #endif\n            #ifdef ASPECT_AXIS_Y\n                tc.x=(1.0-aspectPos)-(((1.0-aspectPos)-tc.x)/aspectTex);\n            #endif\n        #endif\n\n        #ifdef TEX_TRANSFORM\n            vec3 coordinates=vec3(tc.x, tc.y,1.0);\n            tc=(transform * coordinates ).xy;\n        #endif\n\n        blendRGBA=texture(image,tc);\n\n        vec3 blend=blendRGBA.rgb;\n        vec4 baseRGBA=texture(tex,texCoord);\n        vec3 base=baseRGBA.rgb;\n\n\n        #ifdef PREMUL\n            blend.rgb = (blend.rgb) + (base.rgb * (1.0 - blendRGBA.a));\n        #endif\n\n        vec3 colNew=_blend(base,blend);\n\n\n\n\n        #ifdef REMOVE_ALPHA_SRC\n            blendRGBA.a=1.0;\n        #endif\n\n        #ifdef HAS_TEXTUREALPHA\n            vec4 colImgAlpha=texture(imageAlpha,tc);\n            float colImgAlphaAlpha=colImgAlpha.a;\n\n            #ifdef ALPHA_FROM_LUMINANCE\n                vec3 gray = vec3(dot(vec3(0.2126,0.7152,0.0722), colImgAlpha.rgb ));\n                colImgAlphaAlpha=(gray.r+gray.g+gray.b)/3.0;\n            #endif\n\n            #ifdef ALPHA_FROM_INV_UMINANCE\n                vec3 gray = vec3(dot(vec3(0.2126,0.7152,0.0722), colImgAlpha.rgb ));\n                colImgAlphaAlpha=1.0-(gray.r+gray.g+gray.b)/3.0;\n            #endif\n\n            #ifdef INVERT_ALPHA\n                colImgAlphaAlpha=clamp(colImgAlphaAlpha,0.0,1.0);\n                colImgAlphaAlpha=1.0-colImgAlphaAlpha;\n            #endif\n\n            blendRGBA.a=colImgAlphaAlpha*blendRGBA.a;\n        #endif\n    #endif\n\n    float am=amount;\n\n    #ifdef CLIP_REPEAT\n        if(tc.y>1.0 || tc.y<0.0 || tc.x>1.0 || tc.x<0.0)\n        {\n            // colNew.rgb=vec3(0.0);\n            am=0.0;\n        }\n    #endif\n\n    #ifdef ASPECT_RATIO\n        #ifdef ASPECT_CROP\n            if(tc.y>1.0 || tc.y<0.0 || tc.x>1.0 || tc.x<0.0)\n            {\n                colNew.rgb=base.rgb;\n                am=0.0;\n            }\n\n        #endif\n    #endif\n\n\n\n    #ifndef PREMUL\n        blendRGBA.rgb=mix(colNew,base,1.0-(am*blendRGBA.a));\n        blendRGBA.a=clamp(baseRGBA.a+(blendRGBA.a*am),0.,1.);\n    #endif\n\n    #ifdef PREMUL\n        // premultiply\n        // blendRGBA.rgb = (blendRGBA.rgb) + (baseRGBA.rgb * (1.0 - blendRGBA.a));\n        blendRGBA=vec4(\n            mix(colNew.rgb,base,1.0-(am*blendRGBA.a)),\n            blendRGBA.a*am+baseRGBA.a\n            );\n    #endif\n\n    #ifdef ALPHA_MASK\n    blendRGBA.a=baseRGBA.a;\n    #endif\n\n    outColor=blendRGBA;\n}\n\n\n\n\n\n\n\n","drawimage_vert":"IN vec3 vPosition;\nIN vec2 attrTexCoord;\nIN vec3 attrVertNormal;\n\nUNI mat4 projMatrix;\nUNI mat4 mvMatrix;\n\nOUT vec2 texCoord;\n// OUT vec3 norm;\n\n#ifdef TEX_TRANSFORM\n    UNI float posX;\n    UNI float posY;\n    UNI float scaleX;\n    UNI float scaleY;\n    UNI float rotate;\n    OUT mat3 transform;\n#endif\n\nvoid main()\n{\n   texCoord=attrTexCoord;\n//   norm=attrVertNormal;\n\n   #ifdef TEX_TRANSFORM\n        vec3 coordinates=vec3(attrTexCoord.x, attrTexCoord.y,1.0);\n        float angle = radians( rotate );\n        vec2 scale= vec2(scaleX,scaleY);\n        vec2 translate= vec2(posX,posY);\n\n        transform = mat3(   scale.x * cos( angle ), scale.x * sin( angle ), 0.0,\n            - scale.y * sin( angle ), scale.y * cos( angle ), 0.0,\n            - 0.5 * scale.x * cos( angle ) + 0.5 * scale.y * sin( angle ) - 0.5 * translate.x*2.0 + 0.5,  - 0.5 * scale.x * sin( angle ) - 0.5 * scale.y * cos( angle ) - 0.5 * translate.y*2.0 + 0.5, 1.0);\n   #endif\n\n   gl_Position = projMatrix * mvMatrix * vec4(vPosition,  1.0);\n}\n",};
const
    render = op.inTrigger("render"),
    blendMode = CGL.TextureEffect.AddBlendSelect(op, "blendMode"),
    amount = op.inValueSlider("amount", 1),

    image = op.inTexture("Image"),
    inAlphaPremul = op.inValueBool("Premultiplied", false),
    inAlphaMask = op.inValueBool("Alpha Mask", false),
    removeAlphaSrc = op.inValueBool("removeAlphaSrc", false),

    imageAlpha = op.inTexture("Mask"),
    alphaSrc = op.inValueSelect("Mask Src", ["alpha channel", "luminance", "luminance inv"], "luminance"),
    invAlphaChannel = op.inValueBool("Invert alpha channel"),

    inAspect = op.inValueBool("Aspect Ratio", false),
    inAspectAxis = op.inValueSelect("Stretch Axis", ["X", "Y"], "X"),
    inAspectPos = op.inValueSlider("Position", 0.0),
    inAspectCrop = op.inValueBool("Crop", false),

    trigger = op.outTrigger("trigger");

blendMode.set("normal");
const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl, "drawimage");

imageAlpha.onLinkChanged = updateAlphaPorts;

op.setPortGroup("Mask", [imageAlpha, alphaSrc, invAlphaChannel]);
op.setPortGroup("Aspect Ratio", [inAspect, inAspectPos, inAspectCrop, inAspectAxis]);

function updateAlphaPorts()
{
    if (imageAlpha.isLinked())
    {
        removeAlphaSrc.setUiAttribs({ "greyout": true });
        alphaSrc.setUiAttribs({ "greyout": false });
        invAlphaChannel.setUiAttribs({ "greyout": false });
    }
    else
    {
        removeAlphaSrc.setUiAttribs({ "greyout": false });
        alphaSrc.setUiAttribs({ "greyout": true });
        invAlphaChannel.setUiAttribs({ "greyout": true });
    }
}

op.toWorkPortsNeedToBeLinked(image);

shader.setSource(attachments.drawimage_vert, attachments.drawimage_frag);

const
    textureUniform = new CGL.Uniform(shader, "t", "tex", 0),
    textureImaghe = new CGL.Uniform(shader, "t", "image", 1),
    textureAlpha = new CGL.Uniform(shader, "t", "imageAlpha", 2),
    uniTexAspect = new CGL.Uniform(shader, "f", "aspectTex", 1),
    uniAspectPos = new CGL.Uniform(shader, "f", "aspectPos", inAspectPos);

inAspect.onChange =
    inAspectCrop.onChange =
    inAspectAxis.onChange = updateAspectRatio;

function updateAspectRatio()
{
    shader.removeDefine("ASPECT_AXIS_X");
    shader.removeDefine("ASPECT_AXIS_Y");
    shader.removeDefine("ASPECT_CROP");

    inAspectPos.setUiAttribs({ "greyout": !inAspect.get() });
    inAspectCrop.setUiAttribs({ "greyout": !inAspect.get() });
    inAspectAxis.setUiAttribs({ "greyout": !inAspect.get() });

    if (inAspect.get())
    {
        shader.define("ASPECT_RATIO");

        if (inAspectCrop.get()) shader.define("ASPECT_CROP");

        if (inAspectAxis.get() == "X") shader.define("ASPECT_AXIS_X");
        if (inAspectAxis.get() == "Y") shader.define("ASPECT_AXIS_Y");
    }
    else
    {
        shader.removeDefine("ASPECT_RATIO");
        if (inAspectCrop.get()) shader.define("ASPECT_CROP");

        if (inAspectAxis.get() == "X") shader.define("ASPECT_AXIS_X");
        if (inAspectAxis.get() == "Y") shader.define("ASPECT_AXIS_Y");
    }
}

//
// texture flip
//
const flipX = op.inValueBool("flip x");
const flipY = op.inValueBool("flip y");

//
// texture transform
//

let doTransform = op.inValueBool("Transform");

let scaleX = op.inValueSlider("Scale X", 1);
let scaleY = op.inValueSlider("Scale Y", 1);

let posX = op.inValue("Position X", 0);
let posY = op.inValue("Position Y", 0);

let rotate = op.inValue("Rotation", 0);

const inClipRepeat = op.inValueBool("Clip Repeat", false);

const uniScaleX = new CGL.Uniform(shader, "f", "scaleX", scaleX);
const uniScaleY = new CGL.Uniform(shader, "f", "scaleY", scaleY);
const uniPosX = new CGL.Uniform(shader, "f", "posX", posX);
const uniPosY = new CGL.Uniform(shader, "f", "posY", posY);
const uniRotate = new CGL.Uniform(shader, "f", "rotate", rotate);

doTransform.onChange = updateTransformPorts;

function updateTransformPorts()
{
    shader.toggleDefine("TEX_TRANSFORM", doTransform.get());

    scaleX.setUiAttribs({ "greyout": !doTransform.get() });
    scaleY.setUiAttribs({ "greyout": !doTransform.get() });
    posX.setUiAttribs({ "greyout": !doTransform.get() });
    posY.setUiAttribs({ "greyout": !doTransform.get() });
    rotate.setUiAttribs({ "greyout": !doTransform.get() });
}

CGL.TextureEffect.setupBlending(op, shader, blendMode, amount);

const amountUniform = new CGL.Uniform(shader, "f", "amount", amount);

render.onTriggered = doRender;

inClipRepeat.onChange =
    imageAlpha.onChange =
    inAlphaPremul.onChange =
    inAlphaMask.onChange =
    invAlphaChannel.onChange =
    flipY.onChange =
    flipX.onChange =
    removeAlphaSrc.onChange =
    alphaSrc.onChange = updateDefines;

updateTransformPorts();
updateAlphaPorts();
updateAspectRatio();
updateDefines();

function updateDefines()
{
    shader.toggleDefine("REMOVE_ALPHA_SRC", removeAlphaSrc.get());
    shader.toggleDefine("ALPHA_MASK", inAlphaMask.get());

    shader.toggleDefine("CLIP_REPEAT", inClipRepeat.get());

    shader.toggleDefine("HAS_TEXTUREALPHA", imageAlpha.get() && imageAlpha.get().tex);

    shader.toggleDefine("TEX_FLIP_X", flipX.get());
    shader.toggleDefine("TEX_FLIP_Y", flipY.get());

    shader.toggleDefine("INVERT_ALPHA", invAlphaChannel.get());

    shader.toggleDefine("ALPHA_FROM_LUMINANCE", alphaSrc.get() == "luminance");
    shader.toggleDefine("ALPHA_FROM_INV_UMINANCE", alphaSrc.get() == "luminance_inv");
    shader.toggleDefine("PREMUL", inAlphaPremul.get());
}

function doRender()
{
    if (!CGL.TextureEffect.checkOpInEffect(op)) return;

    const tex = image.get();
    if (tex && tex.tex && amount.get() > 0.0)
    {
        cgl.pushShader(shader);
        cgl.currentTextureEffect.bind();

        const imgTex = cgl.currentTextureEffect.getCurrentSourceTexture();
        cgl.setTexture(0, imgTex.tex);

        // if (imgTex && tex)
        // {
        //     if (tex.textureType != imgTex.textureType && (tex.textureType == CGL.Texture.TYPE_FLOAT))
        //         op.setUiError("textypediff", "Drawing 32bit texture into an 8 bit can result in data/precision loss", 1);
        //     else
        //         op.setUiError("textypediff", null);
        // }

        const asp = 1 / (cgl.currentTextureEffect.getWidth() / cgl.currentTextureEffect.getHeight()) * (tex.width / tex.height);
        // uniTexAspect.setValue(1 / (tex.height / tex.width * imgTex.width / imgTex.height));

        uniTexAspect.setValue(asp);

        cgl.setTexture(1, tex.tex);
        // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, image.get().tex );

        if (imageAlpha.get() && imageAlpha.get().tex)
        {
            cgl.setTexture(2, imageAlpha.get().tex);
            // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, imageAlpha.get().tex );
        }

        // cgl.pushBlend(false);

        cgl.pushBlendMode(CGL.BLEND_NONE, true);

        cgl.currentTextureEffect.finish();
        cgl.popBlendMode();

        // cgl.popBlend();

        cgl.popShader();
    }

    trigger.trigger();
}


};

Ops.Gl.ImageCompose.DrawImage_v3.prototype = new CABLES.Op();
CABLES.OPS["8f6b2f15-fcb0-4597-90c0-e5173f2969fe"]={f:Ops.Gl.ImageCompose.DrawImage_v3,objName:"Ops.Gl.ImageCompose.DrawImage_v3"};




// **************************************************************
// 
// Ops.Gl.ImageCompose.ZoomBlur_v2
// 
// **************************************************************

Ops.Gl.ImageCompose.ZoomBlur_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"zoomblur_frag":"UNI sampler2D tex;\nUNI float x;\nUNI float y;\nUNI float strength;\nIN vec2 texCoord;\n\n#ifdef HAS_MASK\n    UNI sampler2D texMask;\n#endif\n\nfloat random(vec3 scale, float seed)\n{\n    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);\n}\n\n#ifdef MASK_SRC_LUM\n    {{CGL.LUMINANCE}}\n#endif\n\nvoid main()\n{\n    float total = 0.0;\n    vec4 color = vec4(0.0);\n    vec2 center=vec2(x,y);\n    center=(center/2.0)+0.5;\n\n    vec2 texSize=vec2(1.0,1.0);\n    vec2 toCenter = center - texCoord * texSize;\n\n    /* randomize the lookup values to hide the fixed number of samples */\n    float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\n    float am = strength;\n\n    #ifdef HAS_MASK\n\n        float mul=1.0;\n        #ifdef MASK_SRC_R\n            mul=texture(texMask,texCoord).r;\n        #endif\n        #ifdef MASK_SRC_G\n            mul=texture(texMask,texCoord).g;\n        #endif\n        #ifdef MASK_SRC_B\n            mul=texture(texMask,texCoord).b;\n        #endif\n        #ifdef MASK_SRC_A\n            mul=texture(texMask,texCoord).a;\n        #endif\n        #ifdef MASK_SRC_LUM\n            mul=cgl_luminance(texture(texMask,texCoord).rgb);\n        #endif\n\n        #ifdef MASK_INV\n            mul=1.0-mul;\n        #endif\n\n        am=am*mul;\n\n        // if(am<=0.0)\n        // {\n        //     outColor=texture(tex, texCoord);\n        //     return;\n        // }\n    #endif\n\n    for (float t = 0.0; t <= NUM_SAMPLES; t++)\n    {\n        float percent = (t + offset) / NUM_SAMPLES;\n        float weight = 4.0 * (percent - percent * percent);\n        vec4 smpl = texture(tex, texCoord + toCenter * percent * am / texSize);\n\n        smpl.rgb *= smpl.a;\n\n        color += smpl * weight;\n        total += weight;\n    }\n\n    outColor = color / total;\n}",};
const
    render = op.inTrigger("render"),
    strength = op.inValueSlider("Strength", 0.5),
    inNumSamples = op.inInt("Samples", 40),
    x = op.inValue("X", 0),
    y = op.inValue("Y", 0),
    inMaskTex = op.inTexture("Strength Map"),
    inMaskSource = op.inSwitch("Source Strength Map", ["R", "G", "B", "A", "Lum"], "R"),
    inMaskInv = op.inBool("Invert Strength Map", false),
    trigger = op.outTrigger("trigger");

op.setPortGroup("Strengh Map", [inMaskTex, inMaskSource, inMaskInv]);

const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl, "zoomblur");

shader.setSource(shader.getDefaultVertexShader(), attachments.zoomblur_frag);

const
    textureUniform = new CGL.Uniform(shader, "t", "tex", 0),
    textureMask = new CGL.Uniform(shader, "t", "texMask", 1),
    uniX = new CGL.Uniform(shader, "f", "x", x),
    uniY = new CGL.Uniform(shader, "f", "y", y),
    strengthUniform = new CGL.Uniform(shader, "f", "strength", strength);

inNumSamples.onChange =
inMaskSource.onChange =
    inMaskInv.onChange =
    inMaskTex.onChange = updateDefines;

updateDefines();

function updateDefines()
{
    shader.toggleDefine("HAS_MASK", inMaskTex.isLinked());

    shader.toggleDefine("MASK_SRC_R", inMaskSource.get() == "R");
    shader.toggleDefine("MASK_SRC_G", inMaskSource.get() == "G");
    shader.toggleDefine("MASK_SRC_B", inMaskSource.get() == "B");
    shader.toggleDefine("MASK_SRC_A", inMaskSource.get() == "A");
    shader.toggleDefine("MASK_SRC_LUM", inMaskSource.get() == "Lum");

    shader.toggleDefine("MASK_INV", inMaskInv.get());

    shader.define("NUM_SAMPLES", inNumSamples.get() + ".0");

    inMaskSource.setUiAttribs({ "greyout": !inMaskTex.isLinked() });
    inMaskInv.setUiAttribs({ "greyout": !inMaskTex.isLinked() });
}

render.onTriggered = function ()
{
    if (!CGL.TextureEffect.checkOpInEffect(op, 3)) return;

    if (strength.get() > 0)
    {
        cgl.pushShader(shader);
        cgl.currentTextureEffect.bind();

        cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);

        if (inMaskTex.get() && inMaskTex.get().tex) cgl.setTexture(1, inMaskTex.get().tex);

        cgl.currentTextureEffect.finish();
        cgl.popShader();
    }
    trigger.trigger();
};


};

Ops.Gl.ImageCompose.ZoomBlur_v2.prototype = new CABLES.Op();
CABLES.OPS["b720a2f5-5501-48ef-90de-94a280ba6fbd"]={f:Ops.Gl.ImageCompose.ZoomBlur_v2,objName:"Ops.Gl.ImageCompose.ZoomBlur_v2"};




// **************************************************************
// 
// Ops.Gl.Meshes.FullscreenRectangle
// 
// **************************************************************

Ops.Gl.Meshes.FullscreenRectangle = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"shader_frag":"UNI sampler2D tex;\nIN vec2 texCoord;\n\nvoid main()\n{\n    outColor= texture(tex,texCoord);\n}\n\n","shader_vert":"{{MODULES_HEAD}}\n\nIN vec3 vPosition;\nUNI mat4 projMatrix;\nUNI mat4 mvMatrix;\n\nOUT vec2 texCoord;\nIN vec2 attrTexCoord;\n\nvoid main()\n{\n   vec4 pos=vec4(vPosition,  1.0);\n\n   texCoord=vec2(attrTexCoord.x,(1.0-attrTexCoord.y));\n\n   gl_Position = projMatrix * mvMatrix * pos;\n}\n",};
const
    render = op.inTrigger("render"),
    inScale = op.inSwitch("Scale", ["Stretch", "Fit"], "Fit"),
    flipY = op.inValueBool("Flip Y"),
    flipX = op.inValueBool("Flip X"),
    inTexture = op.inTexture("Texture"),
    trigger = op.outTrigger("trigger");

const cgl = op.patch.cgl;
let mesh = null;
let geom = new CGL.Geometry("fullscreen rectangle");
let x = 0, y = 0, z = 0, w = 0, h = 0;

op.toWorkShouldNotBeChild("Ops.Gl.TextureEffects.ImageCompose", CABLES.OP_PORT_TYPE_FUNCTION);
op.toWorkPortsNeedToBeLinked(render);

flipX.onChange = rebuildFlip;
flipY.onChange = rebuildFlip;
render.onTriggered = doRender;
inTexture.onLinkChanged = updateUi;
inScale.onChange = updateScale;

const shader = new CGL.Shader(cgl, "fullscreenrectangle", this);
shader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG"]);

shader.setSource(attachments.shader_vert, attachments.shader_frag);
shader.fullscreenRectUniform = new CGL.Uniform(shader, "t", "tex", 0);
shader.aspectUni = new CGL.Uniform(shader, "f", "aspectTex", 0);

let useShader = false;
let updateShaderLater = true;
let fitImageAspect = false;
let oldVp = [];

updateUi();
updateScale();

inTexture.onChange = function ()
{
    updateShaderLater = true;
};

function updateUi()
{
    if (!CABLES.UI) return;
    flipY.setUiAttribs({ "greyout": !inTexture.isLinked() });
    flipX.setUiAttribs({ "greyout": !inTexture.isLinked() });
    inScale.setUiAttribs({ "greyout": !inTexture.isLinked() });
}

function updateShader()
{
    let tex = inTexture.get();
    if (tex) useShader = true;
    else useShader = false;
}

op.preRender = function ()
{
    updateShader();
    shader.bind();
    if (mesh)mesh.render(shader);
    doRender();
};

function updateScale()
{
    fitImageAspect = inScale.get() == "Fit";
}

function doRender()
{
    if (cgl.getViewPort()[2] != w || cgl.getViewPort()[3] != h || !mesh) rebuild();

    if (updateShaderLater) updateShader();

    cgl.pushPMatrix();
    mat4.identity(cgl.pMatrix);
    mat4.ortho(cgl.pMatrix, 0, w, h, 0, -10.0, 1000);

    cgl.pushModelMatrix();
    mat4.identity(cgl.mMatrix);

    cgl.pushViewMatrix();
    mat4.identity(cgl.vMatrix);

    if (fitImageAspect && inTexture.get())
    {
        const rat = inTexture.get().width / inTexture.get().height;

        let _h = h;
        let _w = h * rat;

        if (_w > w)
        {
            _h = w * 1 / rat;
            _w = w;
        }

        oldVp[0] = cgl.getViewPort()[0];
        oldVp[1] = cgl.getViewPort()[1];
        oldVp[2] = cgl.getViewPort()[2];
        oldVp[3] = cgl.getViewPort()[3];

        cgl.setViewPort((w - _w) / 2, (h - _h) / 2, _w, _h);
    }

    if (useShader)
    {
        if (inTexture.get())
            cgl.setTexture(0, inTexture.get().tex);

        mesh.render(shader);
    }
    else
    {
        mesh.render(cgl.getShader());
    }

    // if (trigger.isLinked())
    cgl.gl.clear(cgl.gl.DEPTH_BUFFER_BIT);

    cgl.popPMatrix();
    cgl.popModelMatrix();
    cgl.popViewMatrix();

    if (fitImageAspect && inTexture.get())
        cgl.setViewPort(oldVp[0], oldVp[1], oldVp[2], oldVp[3]);

    trigger.trigger();
}

function rebuildFlip()
{
    mesh = null;
}

function rebuild()
{
    const currentViewPort = cgl.getViewPort();

    if (currentViewPort[2] == w && currentViewPort[3] == h && mesh) return;

    let xx = 0, xy = 0;

    w = currentViewPort[2];
    h = currentViewPort[3];

    geom.vertices = new Float32Array([
        xx + w, xy + h, 0.0,
        xx, xy + h, 0.0,
        xx + w, xy, 0.0,
        xx, xy, 0.0
    ]);

    let tc = null;

    if (flipY.get())
        tc = new Float32Array([
            1.0, 0.0,
            0.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ]);
    else
        tc = new Float32Array([
            1.0, 1.0,
            0.0, 1.0,
            1.0, 0.0,
            0.0, 0.0
        ]);

    if (flipX.get())
    {
        tc[0] = 0.0;
        tc[2] = 1.0;
        tc[4] = 0.0;
        tc[6] = 1.0;
    }

    geom.setTexCoords(tc);

    geom.verticesIndices = new Uint16Array([
        2, 1, 0,
        3, 1, 2
    ]);

    geom.vertexNormals = new Float32Array([
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
    ]);
    geom.tangents = new Float32Array([
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0]);
    geom.biTangents == new Float32Array([
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0]);

    if (!mesh) mesh = new CGL.Mesh(cgl, geom);
    else mesh.setGeom(geom);
}


};

Ops.Gl.Meshes.FullscreenRectangle.prototype = new CABLES.Op();
CABLES.OPS["255bd15b-cc91-4a12-9b4e-53c710cbb282"]={f:Ops.Gl.Meshes.FullscreenRectangle,objName:"Ops.Gl.Meshes.FullscreenRectangle"};




// **************************************************************
// 
// Ops.Gl.Matrix.Transform
// 
// **************************************************************

Ops.Gl.Matrix.Transform = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    posX = op.inValue("posX", 0),
    posY = op.inValue("posY", 0),
    posZ = op.inValue("posZ", 0),
    scale = op.inValue("scale", 1),
    rotX = op.inValue("rotX", 0),
    rotY = op.inValue("rotY", 0),
    rotZ = op.inValue("rotZ", 0),
    trigger = op.outTrigger("trigger");

op.setPortGroup("Rotation", [rotX, rotY, rotZ]);
op.setPortGroup("Position", [posX, posY, posZ]);
op.setPortGroup("Scale", [scale]);
op.setUiAxisPorts(posX, posY, posZ);

op.toWorkPortsNeedToBeLinked(render, trigger);

const vPos = vec3.create();
const vScale = vec3.create();
const transMatrix = mat4.create();
mat4.identity(transMatrix);

let
    doScale = false,
    doTranslate = false,
    translationChanged = true,
    scaleChanged = true,
    rotChanged = true;

rotX.onChange = rotY.onChange = rotZ.onChange = setRotChanged;
posX.onChange = posY.onChange = posZ.onChange = setTranslateChanged;
scale.onChange = setScaleChanged;

render.onTriggered = function ()
{
    // if(!CGL.TextureEffect.checkOpNotInTextureEffect(op)) return;

    let updateMatrix = false;
    if (translationChanged)
    {
        updateTranslation();
        updateMatrix = true;
    }
    if (scaleChanged)
    {
        updateScale();
        updateMatrix = true;
    }
    if (rotChanged) updateMatrix = true;

    if (updateMatrix) doUpdateMatrix();

    const cg = op.patch.cg || op.patch.cgl;
    cg.pushModelMatrix();
    mat4.multiply(cg.mMatrix, cg.mMatrix, transMatrix);

    trigger.trigger();
    cg.popModelMatrix();

    if (CABLES.UI)
    {
        if (!posX.isLinked() && !posY.isLinked() && !posZ.isLinked())
        {
            gui.setTransform(op.id, posX.get(), posY.get(), posZ.get());

            if (op.isCurrentUiOp())
                gui.setTransformGizmo(
                    {
                        "posX": posX,
                        "posY": posY,
                        "posZ": posZ,
                    });
        }
    }
};

// op.transform3d = function ()
// {
//     return { "pos": [posX, posY, posZ] };
// };

function doUpdateMatrix()
{
    mat4.identity(transMatrix);
    if (doTranslate)mat4.translate(transMatrix, transMatrix, vPos);

    if (rotX.get() !== 0)mat4.rotateX(transMatrix, transMatrix, rotX.get() * CGL.DEG2RAD);
    if (rotY.get() !== 0)mat4.rotateY(transMatrix, transMatrix, rotY.get() * CGL.DEG2RAD);
    if (rotZ.get() !== 0)mat4.rotateZ(transMatrix, transMatrix, rotZ.get() * CGL.DEG2RAD);

    if (doScale)mat4.scale(transMatrix, transMatrix, vScale);
    rotChanged = false;
}

function updateTranslation()
{
    doTranslate = false;
    if (posX.get() !== 0.0 || posY.get() !== 0.0 || posZ.get() !== 0.0) doTranslate = true;
    vec3.set(vPos, posX.get(), posY.get(), posZ.get());
    translationChanged = false;
}

function updateScale()
{
    // doScale=false;
    // if(scale.get()!==0.0)
    doScale = true;
    vec3.set(vScale, scale.get(), scale.get(), scale.get());
    scaleChanged = false;
}

function setTranslateChanged()
{
    translationChanged = true;
}

function setScaleChanged()
{
    scaleChanged = true;
}

function setRotChanged()
{
    rotChanged = true;
}

doUpdateMatrix();


};

Ops.Gl.Matrix.Transform.prototype = new CABLES.Op();
CABLES.OPS["650baeb1-db2d-4781-9af6-ab4e9d4277be"]={f:Ops.Gl.Matrix.Transform,objName:"Ops.Gl.Matrix.Transform"};




// **************************************************************
// 
// Ops.Gl.ImageCompose.BrightnessContrast
// 
// **************************************************************

Ops.Gl.ImageCompose.BrightnessContrast = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"brightness_contrast_frag":"IN vec2 texCoord;\nUNI sampler2D tex;\nUNI float amount;\nUNI float amountbright;\n\nvoid main()\n{\n    vec4 col=vec4(1.0,0.0,0.0,1.0);\n    col=texture(tex,texCoord);\n\n    // apply contrast\n    col.rgb = ((col.rgb - 0.5) * max(amount*2.0, 0.0))+0.5;\n\n    // apply brightness\n    col.rgb *= amountbright*2.0;\n\n    outColor = col;\n}",};
const
    render = op.inTrigger("render"),
    amount = op.inValueSlider("contrast", 0.5),
    amountBright = op.inValueSlider("brightness", 0.5),
    trigger = op.outTrigger("trigger");

const cgl = op.patch.cgl;

const shader = new CGL.Shader(cgl, "brightnesscontrast");
shader.setSource(shader.getDefaultVertexShader(), attachments.brightness_contrast_frag);
const textureUniform = new CGL.Uniform(shader, "t", "tex", 0);
const amountUniform = new CGL.Uniform(shader, "f", "amount", amount);
const amountBrightUniform = new CGL.Uniform(shader, "f", "amountbright", amountBright);

render.onTriggered = function ()
{
    if (!CGL.TextureEffect.checkOpInEffect(op)) return;

    if (!cgl.currentTextureEffect.getCurrentSourceTexture()) return;
    if (!CGL.TextureEffect.checkOpInEffect(op)) return;

    cgl.pushShader(shader);
    cgl.currentTextureEffect.bind();

    cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);

    cgl.currentTextureEffect.finish();
    cgl.popShader();

    trigger.trigger();
};


};

Ops.Gl.ImageCompose.BrightnessContrast.prototype = new CABLES.Op();
CABLES.OPS["54b89199-c594-4dff-bc48-82d6c7a55e8a"]={f:Ops.Gl.ImageCompose.BrightnessContrast,objName:"Ops.Gl.ImageCompose.BrightnessContrast"};




// **************************************************************
// 
// Ops.Gl.ImageCompose.Blur
// 
// **************************************************************

Ops.Gl.ImageCompose.Blur = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"blur_frag":"IN vec2 texCoord;\nUNI sampler2D tex;\nUNI float dirX;\nUNI float dirY;\nUNI float amount;\n\n#ifdef HAS_MASK\n    UNI sampler2D imageMask;\n#endif\n\nfloat random(vec3 scale, float seed)\n{\n    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);\n}\n\nvoid main()\n{\n    vec4 color = vec4(0.0);\n    float total = 0.0;\n\n    float am=amount;\n    #ifdef HAS_MASK\n        am=amount*texture(imageMask,texCoord).r;\n        if(am<=0.02)\n        {\n            outColor=texture(tex, texCoord);\n            return;\n        }\n    #endif\n\n    vec2 delta=vec2(dirX*am*0.01,dirY*am*0.01);\n\n\n    float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\n\n    #ifdef MOBILE\n        offset = 0.1;\n    #endif\n\n    #if defined(FASTBLUR) && !defined(MOBILE)\n        const float range=5.0;\n    #else\n        const float range=20.0;\n    #endif\n\n    for (float t = -range; t <= range; t+=1.0)\n    {\n        float percent = (t + offset - 0.5) / range;\n        float weight = 1.0 - abs(percent);\n        vec4 smpl = texture(tex, texCoord + delta * percent);\n\n        smpl.rgb *= smpl.a;\n\n        color += smpl * weight;\n        total += weight;\n    }\n\n    outColor= color / total;\n\n    outColor.rgb /= outColor.a + 0.00001;\n\n\n\n}\n",};
const render = op.inTrigger("render");
const trigger = op.outTrigger("trigger");
const amount = op.inValueFloat("amount");
const direction = op.inSwitch("direction", ["both", "vertical", "horizontal"], "both");
const fast = op.inValueBool("Fast", true);
const cgl = op.patch.cgl;

amount.set(10);

let shader = new CGL.Shader(cgl, "blur");

shader.define("FASTBLUR");

fast.onChange = function ()
{
    if (fast.get()) shader.define("FASTBLUR");
    else shader.removeDefine("FASTBLUR");
};

shader.setSource(shader.getDefaultVertexShader(), attachments.blur_frag);
let textureUniform = new CGL.Uniform(shader, "t", "tex", 0);

let uniDirX = new CGL.Uniform(shader, "f", "dirX", 0);
let uniDirY = new CGL.Uniform(shader, "f", "dirY", 0);

let uniWidth = new CGL.Uniform(shader, "f", "width", 0);
let uniHeight = new CGL.Uniform(shader, "f", "height", 0);

let uniAmount = new CGL.Uniform(shader, "f", "amount", amount.get());
amount.onChange = function () { uniAmount.setValue(amount.get()); };

let textureAlpha = new CGL.Uniform(shader, "t", "imageMask", 1);

let showingError = false;

function fullScreenBlurWarning()
{
    if (cgl.currentTextureEffect.getCurrentSourceTexture().width == cgl.canvasWidth &&
        cgl.currentTextureEffect.getCurrentSourceTexture().height == cgl.canvasHeight)
    {
        op.setUiError("warning", "Full screen blurs are slow! Try reducing the resolution to 1/2 or a 1/4", 0);
    }
    else
    {
        op.setUiError("warning", null);
    }
}

let dir = 0;
direction.onChange = function ()
{
    if (direction.get() == "both")dir = 0;
    if (direction.get() == "horizontal")dir = 1;
    if (direction.get() == "vertical")dir = 2;
};

let mask = op.inTexture("mask");

mask.onChange = function ()
{
    if (mask.get() && mask.get().tex) shader.define("HAS_MASK");
    else shader.removeDefine("HAS_MASK");
};

render.onTriggered = function ()
{
    if (!CGL.TextureEffect.checkOpInEffect(op)) return;

    cgl.pushShader(shader);

    uniWidth.setValue(cgl.currentTextureEffect.getCurrentSourceTexture().width);
    uniHeight.setValue(cgl.currentTextureEffect.getCurrentSourceTexture().height);

    fullScreenBlurWarning();

    // first pass
    if (dir === 0 || dir == 2)
    {
        cgl.currentTextureEffect.bind();
        cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);

        if (mask.get() && mask.get().tex)
        {
            cgl.setTexture(1, mask.get().tex);
            // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, mask.get().tex );
        }

        uniDirX.setValue(0.0);
        uniDirY.setValue(1.0);

        cgl.currentTextureEffect.finish();
    }

    // second pass
    if (dir === 0 || dir == 1)
    {
        cgl.currentTextureEffect.bind();
        cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);

        if (mask.get() && mask.get().tex)
        {
            cgl.setTexture(1, mask.get().tex);
            // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, mask.get().tex );
        }

        uniDirX.setValue(1.0);
        uniDirY.setValue(0.0);

        cgl.currentTextureEffect.finish();
    }

    cgl.popShader();
    trigger.trigger();
};


};

Ops.Gl.ImageCompose.Blur.prototype = new CABLES.Op();
CABLES.OPS["54f26f53-f637-44c1-9bfb-a2f2b722e998"]={f:Ops.Gl.ImageCompose.Blur,objName:"Ops.Gl.ImageCompose.Blur"};




// **************************************************************
// 
// Ops.Gl.ImageCompose.ColorMap_v2
// 
// **************************************************************

Ops.Gl.ImageCompose.ColorMap_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"colormap_frag":"IN vec2 texCoord;\nUNI sampler2D tex;\nUNI sampler2D gradient;\nUNI float pos;\nUNI float amount;\nUNI float vmin;\nUNI float vmax;\n\n{{CGL.BLENDMODES3}}\n\n\nfloat lumi(vec3 color)\n{\n   return vec3(dot(vec3(0.2126,0.7152,0.0722), color)).r;\n}\n\nvoid main()\n{\n    vec4 base=texture(tex,texCoord);\n    float a=base.a;\n\n    base=clamp(base,vmin,vmax);\n\n    #ifdef METH_LUMI\n        vec4 color=texture(gradient,vec2(lumi(base.rgb),pos));\n    #endif\n\n    #ifdef METH_CHANNELS\n        vec4 color=vec4(1.0);\n        color.r=texture(gradient,vec2(base.r,pos)).r;\n        color.g=texture(gradient,vec2(base.g,pos)).g;\n        color.b=texture(gradient,vec2(base.b,pos)).b;\n    #endif\n\n    base.a=color.a=a;\n\n\n    outColor=cgl_blendPixel(base,color,amount);\n\n}\n",};
let render = op.inTrigger("render");
let trigger = op.outTrigger("trigger");

const blendMode = CGL.TextureEffect.AddBlendSelect(op, "Blend Mode", "normal");
const amount = op.inValueSlider("Amount", 1);

let inGradient = op.inTexture("Gradient");
let inMethod = op.inSwitch("Method", ["Luminance", "Channels"], "Luminance");

let inMin = op.inFloatSlider("Min", 0);
let inMax = op.inFloatSlider("Max", 1);

let inPos = op.inValueSlider("Position", 0.5);

op.setPortGroup("Vertical Position", [inMin, inMax, inPos]);

let cgl = op.patch.cgl;
let shader = new CGL.Shader(cgl, op.name, op);
shader.define("METH_LUMI");

shader.setSource(shader.getDefaultVertexShader(), attachments.colormap_frag);
let textureUniform = new CGL.Uniform(shader, "t", "tex", 0);
let textureUniform2 = new CGL.Uniform(shader, "t", "gradient", 1);
let uniPos = new CGL.Uniform(shader, "f", "pos", inPos);
let uniMin = new CGL.Uniform(shader, "f", "vmin", inMin);
let uniMax = new CGL.Uniform(shader, "f", "vmax", inMax);
let uniAmount = new CGL.Uniform(shader, "f", "amount", amount);

CGL.TextureEffect.setupBlending(op, shader, blendMode, amount);

inMethod.onChange = () =>
{
    shader.toggleDefine("METH_LUMI", inMethod.get() == "Luminance");
    shader.toggleDefine("METH_CHANNELS", inMethod.get() == "Channels");
};

render.onTriggered = function ()
{
    if (!CGL.TextureEffect.checkOpInEffect(op, 3)) return;
    if (!inGradient.get()) return;

    cgl.pushShader(shader);
    cgl.currentTextureEffect.bind();

    cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);

    cgl.setTexture(1, inGradient.get().tex);

    cgl.currentTextureEffect.finish();
    cgl.popShader();

    trigger.trigger();
};


};

Ops.Gl.ImageCompose.ColorMap_v2.prototype = new CABLES.Op();
CABLES.OPS["440c1675-122d-411f-b848-16c60b677120"]={f:Ops.Gl.ImageCompose.ColorMap_v2,objName:"Ops.Gl.ImageCompose.ColorMap_v2"};




// **************************************************************
// 
// Ops.Color.ColorPalettes
// 
// **************************************************************

Ops.Color.ColorPalettes = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const index = op.inValueInt("Index", 0);
const textureOut = op.outTexture("Texture");
const inLinear = op.inValueBool("Smooth");
const arrOut = op.outArray("Color Array");

let canvas = document.createElement("canvas");
canvas.id = "canvas_" + CABLES.generateUUID();
canvas.width = 5;
canvas.height = 8;
canvas.style.display = "none";

let body = document.getElementsByTagName("body")[0];
body.appendChild(canvas);
let ctx = canvas.getContext("2d");

index.onChange =
inLinear.onChange = buildTextureLater;

let arr = [];
arr.length = 5 * 3;
let lastFilter = null;

buildTextureLater();

function hexToR(h)
{
    return parseInt((cutHex(h)).substring(0, 2), 16);
}

function hexToG(h)
{
    return parseInt((cutHex(h)).substring(2, 4), 16);
}

function hexToB(h)
{
    return parseInt((cutHex(h)).substring(4, 6), 16);
}

function cutHex(h = "")
{
    return (h.charAt(0) == "#") ? h.substring(1, 7) : h;
}

function buildTextureLater()
{
    op.patch.cgl.addNextFrameOnceCallback(buildTexture);
}

function buildTexture()
{
    let ind = Math.round(index.get()) * 5;
    if (ind >= colors.length - 5)ind = 0;
    if (ind < 0)ind = 0;
    if (ind != ind)ind = 0;

    for (let i = 0; i < 5; i++)
    {
        let r = hexToR(colors[ind + i]);
        let g = hexToG(colors[ind + i]);
        let b = hexToB(colors[ind + i]);

        arr[i * 3 + 0] = r / 255;
        arr[i * 3 + 1] = g / 255;
        arr[i * 3 + 2] = b / 255;

        ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
        ctx.fillRect(
            canvas.width / 5 * i,
            0,
            canvas.width / 5,
            canvas.height
        );
    }

    let filter = CGL.Texture.FILTER_NEAREST;
    if (inLinear.get())filter = CGL.Texture.FILTER_LINEAR;

    if (lastFilter == filter && textureOut.get()) textureOut.get().initTexture(canvas, filter);
    else textureOut.set(new CGL.Texture.createFromImage(op.patch.cgl, canvas, { "filter": filter }));

    arrOut.set(null);
    arrOut.set(arr);
    textureOut.get().unpackAlpha = false;
    lastFilter = filter;
}

op.onDelete = function ()
{
    canvas.remove();
};

const colors = [
    "#E6E2AF", "#A7A37E", "#EFECCA", "#046380", "002F2F",
    "#468966", "#FFF0A5", "#FFB03B", "#B64926", "8E2800",
    "#FCFFF5", "#D1DBBD", "#91AA9D", "#3E606F", "193441",
    "#FF6138", "#FFFF9D", "#BEEB9F", "#79BD8F", "00A388",
    "#105B63", "#FFFAD5", "#FFD34E", "#DB9E36", "BD4932",
    "#225378", "#1695A3", "#ACF0F2", "#F3FFE2", "EB7F00",
    "#2C3E50", "#E74C3C", "#ECF0F1", "#3498DB", "2980B9",
    "#000000", "#263248", "#7E8AA2", "#FFFFFF", "FF9800",
    "#004358", "#1F8A70", "#BEDB39", "#FFE11A", "FD7400",
    "#DC3522", "#D9CB9E", "#374140", "#2A2C2B", "1E1E20",
    "#7D8A2E", "#C9D787", "#FFFFFF", "#FFC0A9", "FF8598",
    "#B9121B", "#4C1B1B", "#F6E497", "#FCFAE1", "BD8D46",
    "#2E0927", "#D90000", "#FF2D00", "#FF8C00", "04756F",
    "#595241", "#B8AE9C", "#FFFFFF", "#ACCFCC", "8A0917",
    "#10222B", "#95AB63", "#BDD684", "#E2F0D6", "F6FFE0",
    "#F6F792", "#333745", "#77C4D3", "#DAEDE2", "EA2E49",
    "#703030", "#2F343B", "#7E827A", "#E3CDA4", "C77966",
    "#2F2933", "#01A2A6", "#29D9C2", "#BDF271", "FFFFA6",
    "#D8CAA8", "#5C832F", "#284907", "#382513", "363942",
    "#FFF8E3", "#CCCC9F", "#33332D", "#9FB4CC", "DB4105",
    "#85DB18", "#CDE855", "#F5F6D4", "#A7C520", "493F0B",
    "#04BFBF", "#CAFCD8", "#F7E967", "#A9CF54", "588F27",
    "#292929", "#5B7876", "#8F9E8B", "#F2E6B6", "412A22",
    "#332532", "#644D52", "#F77A52", "#FF974F", "A49A87",
    "#405952", "#9C9B7A", "#FFD393", "#FF974F", "F54F29",
    "#2B3A42", "#3F5765", "#BDD4DE", "#EFEFEF", "FF530D",
    "#962D3E", "#343642", "#979C9C", "#F2EBC7", "348899",
    "#96CA2D", "#B5E655", "#EDF7F2", "#4BB5C1", "7FC6BC",
    "#1C1D21", "#31353D", "#445878", "#92CDCF", "EEEFF7",
    "#3E454C", "#2185C5", "#7ECEFD", "#FFF6E5", "FF7F66",
    "#00585F", "#009393", "#FFFCC4", "#F0EDBB", "FF3800",
    "#B4AF91", "#787746", "#40411E", "#32331D", "C03000",
    "#63A69F", "#F2E1AC", "#F2836B", "#F2594B", "CD2C24",
    "#88A825", "#35203B", "#911146", "#CF4A30", "ED8C2B",
    "#F2385A", "#F5A503", "#E9F1DF", "#4AD9D9", "36B1BF",
    "#CFC291", "#FFF6C5", "#A1E8D9", "#FF712C", "695D46",
    "#FF5335", "#B39C85", "#306E73", "#3B424D", "1D181F",
    "#000000", "#333333", "#FF358B", "#01B0F0", "AEEE00",
    "#E8E595", "#D0A825", "#40627C", "#26393D", "FFFAE4",
    "#E7E8D1", "#D3CEAA", "#FBF7E4", "#424242", "8E001C",
    "#354242", "#ACEBAE", "#FFFF9D", "#C9DE55", "7D9100",
    "#2F2933", "#01A2A6", "#29D9C2", "#BDF271", "FFFFA6",
    "#DDDCC5", "#958976", "#611427", "#1D2326", "6A6A61",
    "#6C6E58", "#3E423A", "#417378", "#A4CFBE", "F4F7D9",
    "#E1E6FA", "#C4D7ED", "#ABC8E2", "#375D81", "183152",
    "#6B0C22", "#D9042B", "#F4CB89", "#588C8C", "011C26",
    "#304269", "#91BED4", "#D9E8F5", "#FFFFFF", "F26101",
    "#96CEB4", "#FFEEAD", "#FF6F69", "#FFCC5C", "AAD8B0",
    "#B0CC99", "#677E52", "#B7CA79", "#F6E8B1", "89725B",
    "#334D5C", "#45B29D", "#EFC94C", "#E27A3F", "DF5A49",
    "#16193B", "#35478C", "#4E7AC7", "#7FB2F0", "ADD5F7",
    "#00261C", "#044D29", "#168039", "#45BF55", "96ED89",
    "#36362C", "#5D917D", "#A8AD80", "#E6D4A7", "825534",
    "#F9E4AD", "#E6B098", "#CC4452", "#723147", "31152B",
    "#2C3E50", "#FC4349", "#D7DADB", "#6DBCDB", "FFFFFF",
    "#002635", "#013440", "#AB1A25", "#D97925", "EFE7BE",
    "#FF8000", "#FFD933", "#CCCC52", "#8FB359", "192B33",
    "#272F32", "#9DBDC6", "#FFFFFF", "#FF3D2E", "DAEAEF",
    "#B8ECD7", "#083643", "#B1E001", "#CEF09D", "476C5E",
    "#002F32", "#42826C", "#A5C77F", "#FFC861", "C84663",
    "#5C4B51", "#8CBEB2", "#F2EBBF", "#F3B562", "F06060",
    "#5A1F00", "#D1570D", "#FDE792", "#477725", "A9CC66",
    "#5E0042", "#2C2233", "#005869", "#00856A", "8DB500",
    "#52656B", "#FF3B77", "#CDFF00", "#FFFFFF", "B8B89F",
    "#801637", "#047878", "#FFB733", "#F57336", "C22121",
    "#730046", "#BFBB11", "#FFC200", "#E88801", "C93C00",
    "#24221F", "#363F45", "#4B5F6D", "#5E7C88", "FEB41C",
    "#E64661", "#FFA644", "#998A2F", "#2C594F", "002D40",
    "#C24704", "#D9CC3C", "#FFEB79", "#A0E0A9", "00ADA7",
    "#484A47", "#C1CE96", "#ECEBF0", "#687D77", "353129",
    "#588C7E", "#F2E394", "#F2AE72", "#D96459", "8C4646",
    "#BAB293", "#A39770", "#EFE4BD", "#A32500", "2B2922",
    "#6A7059", "#FDEEA7", "#9BCC93", "#1A9481", "003D5C",
    "#174C4F", "#207178", "#FF9666", "#FFE184", "F5E9BE",
    "#D5FBFF", "#9FBCBF", "#647678", "#2F3738", "59D8E6",
    "#DB5800", "#FF9000", "#F0C600", "#8EA106", "59631E",
    "#450003", "#5C0002", "#94090D", "#D40D12", "FF1D23",
    "#211426", "#413659", "#656F8C", "#9BBFAB", "F2EFDF",
    "#EA6045", "#F8CA4D", "#F5E5C0", "#3F5666", "2F3440",
    "#F2F2F2", "#C6E070", "#91C46C", "#287D7D", "1C344D",
    "#334D5C", "#45B29D", "#EFC94C", "#E27A3F", "DF5A49",
    "#705B35", "#C7B07B", "#E8D9AC", "#FFF6D9", "570026",
    "#F7F2B2", "#ADCF4F", "#84815B", "#4A1A2C", "8E3557",
    "#1A1F2B", "#30395C", "#4A6491", "#85A5CC", "D0E4F2",
    "#25064D", "#36175E", "#553285", "#7B52AB", "9768D1",
    "#004056", "#2C858D", "#74CEB7", "#C9FFD5", "FFFFCB",
    "#CFCA4C", "#FCF5BF", "#9FE5C2", "#5EB299", "745A33",
    "#776045", "#A8C545", "#DFD3B6", "#FFFFFF", "0092B2",
    "#CC3910", "#F1F2C0", "#CCC59E", "#8FA68E", "332F29",
    "#FF6600", "#C13B00", "#5E6D70", "#424E4F", "1B1D1E",
    "#690011", "#BF0426", "#CC2738", "#F2D99C", "E5B96F",
    "#1B1D26", "#425955", "#778C7A", "#F1F2D8", "BFBD9F",
    "#F6B1C3", "#F0788C", "#DE264C", "#BC0D35", "A20D1E",
    "#597533", "#332F28", "#61B594", "#E6DEA5", "C44E18",
    "#3FB8AF", "#7FC7AF", "#DAD8A7", "#FF9E9D", "FF3D7F",
    "#0F2D40", "#194759", "#296B73", "#3E8C84", "D8F2F0",
    "#42282F", "#74A588", "#D6CCAD", "#DC9C76", "D6655A",
    "#002A4A", "#17607D", "#FFF1CE", "#FF9311", "D64700",
    "#003056", "#04518C", "#00A1D9", "#47D9BF", "F2D03B",
    "#13140F", "#D4FF00", "#E4FFE6", "#68776C", "00D6DD",
    "#FCFAD0", "#A1A194", "#5B605F", "#464646", "A90641",
    "#289976", "#67CC8E", "#B1FF91", "#FFE877", "FF5600",
    "#302B1D", "#3F522B", "#737D26", "#A99E46", "D9CB84",
    "#56626B", "#6C9380", "#C0CA55", "#F07C6C", "AD5472",
    "#32450C", "#717400", "#DC8505", "#EC5519", "BE2805",
    "#C7B773", "#E3DB9A", "#F5FCD0", "#B1C2B3", "778691",
    "#E83A25", "#FFE9A3", "#98CC96", "#004563", "191B28",
    "#3399CC", "#67B8DE", "#91C9E8", "#B4DCED", "E8F8FF",
    "#1A212C", "#1D7872", "#71B095", "#DEDBA7", "D13F32",
    "#7D2A35", "#CC9258", "#917A56", "#B4BA6C", "FEFFC2",
    "#E7E9D1", "#D3D4AA", "#FCFAE6", "#444444", "901808",
    "#FFFFFF", "#AEAEAE", "#E64C66", "#2D3E50", "1BBC9B",
    "#E0FFB3", "#61C791", "#31797D", "#2A2F36", "F23C55",
    "#EB5937", "#1C1919", "#403D3C", "#456F74", "D3CBBD",
    "#E6DD00", "#8CB302", "#008C74", "#004C66", "332B40",
    "#14A697", "#F2C12E", "#F29D35", "#F27649", "F25252",
    "#261822", "#40152A", "#731630", "#CC1E2C", "FF5434",
    "#261F27", "#FEE169", "#CDD452", "#F9722E", "C9313D",
    "#5C4B51", "#8CBEB2", "#F2EBBF", "#F3B562", "F06060",
    "#2F3837", "#C5C7B6", "#FFF8D3", "#4C493E", "222028",
    "#E3CBAC", "#9C9985", "#C46D3B", "#788880", "324654",
    "#3F0B1B", "#7A1631", "#CF423C", "#FC7D49", "FFD462",
    "#14212B", "#293845", "#4F6373", "#8F8164", "D9D7AC",
    "#98A89E", "#BAC0AC", "#FAFAC6", "#FF4411", "D40015",
    "#FEFFFF", "#3C3F36", "#9FB03E", "#EBE9DC", "72918B",
    "#CC6B32", "#FFAB48", "#FFE7AD", "#A7C9AE", "888A63",
    "#262526", "#404040", "#8C8979", "#F2F2F2", "F60A20",
    "#00305A", "#004B8D", "#0074D9", "#4192D9", "7ABAF2",
    "#0C273D", "#54D0ED", "#FFFEF1", "#70B85D", "2C5E2E",
    "#4C1B33", "#EFE672", "#98A942", "#2D6960", "141D14",
    "#2F3540", "#666A73", "#F2EDE4", "#D9D1C7", "8C8681",
    "#0D1F30", "#3B6670", "#8BADA3", "#F0E3C0", "DB6C0F",
    "#FFBC67", "#DA727E", "#AC6C82", "#685C79", "455C7B",
    "#092140", "#024959", "#F2C777", "#F24738", "BF2A2A",
    "#133463", "#365FB7", "#799AE0", "#F4EFDC", "BA9B65",
    "#C4D4CB", "#55665E", "#30282A", "#542733", "E84167",
    "#CDDEC6", "#4DAAAB", "#1E4F6A", "#2A423C", "93A189",
    "#EF5411", "#FA5B0F", "#FF6517", "#FF6D1F", "FF822E",
    "#41434A", "#6E9489", "#DEDCC3", "#F2F1E9", "877963",
    "#292929", "#2BBFBD", "#F2B33D", "#F29B30", "F22E2E",
    "#F2385A", "#F5A503", "#E9F1DF", "#56D9CD", "3AA1BF",
    "#D5F8B4", "#A6E3A8", "#8A9A85", "#7E566B", "422335",
    "#3CBAC8", "#93EDD4", "#F3F5C4", "#F9CB8F", "F19181",
    "#979926", "#38CCB5", "#EEFF8E", "#FFD767", "CC2A09",
    "#404040", "#024959", "#037E8C", "#F2EFDC", "F24C27",
    "#94B34D", "#D3FF82", "#363D52", "#121D2B", "111B1C",
    "#282E33", "#25373A", "#164852", "#495E67", "FF3838",
    "#313732", "#8AA8B0", "#DEDEDE", "#FFFFFF", "F26101",
    "#FFFFFF", "#E5E1D1", "#52616D", "#2C343B", "C44741",
    "#FFF6B8", "#ABCCA7", "#403529", "#7A5E2F", "A68236",
    "#4F1025", "#C5003E", "#D9FF5B", "#78AA00", "15362D",
    "#49404F", "#596166", "#D1FFCD", "#A9BD8B", "948A54",
    "#FF2151", "#FF7729", "#FFAD29", "#FFEBCA", "1AB58A",
    "#73603D", "#BF8A49", "#F2CA80", "#5E5A59", "0D0D0D",
    "#3D4C53", "#70B7BA", "#F1433F", "#E7E1D4", "FFFFFF",
    "#006D8D", "#008A6E", "#549E39", "#8AB833", "C0CF3A",
    "#BDDFB3", "#2BAA9C", "#2F2E2E", "#0F2625", "465F3F",
    "#F2F2F2", "#BF0404", "#8C0303", "#590202", "400101",
    "#76A19A", "#272123", "#A68D60", "#B0C5BB", "D9593D",
    "#0E3D59", "#88A61B", "#F29F05", "#F25C05", "D92525",
    "#C1E1ED", "#76C7C6", "#273D3B", "#131A19", "E35C14",
    "#2D112C", "#530031", "#820233", "#CA293E", "EF4339",
    "#AF7575", "#EFD8A1", "#BCD693", "#AFD7DB", "3D9CA8",
    "#D74B4B", "#DCDDD8", "#475F77", "#354B5E", "FFFFFF",
    "#FFF6C9", "#C8E8C7", "#A4DEAB", "#85CC9F", "499E8D",
    "#229396", "#8BA88F", "#C7C5A7", "#F0DFD0", "F23C3C",
    "#57385C", "#A75265", "#EC7263", "#FEBE7E", "FFEDBC",
    "#96526B", "#D17869", "#EBAD60", "#F5CF66", "8BAB8D",
    "#0D1C33", "#17373C", "#2B6832", "#4F9300", "A1D700",
    "#1B2B32", "#37646F", "#A3ABAF", "#E1E7E8", "B22E2F",
    "#C5D9B2", "#53A194", "#572C2C", "#3D2324", "695A3B",
    "#425957", "#81AC8B", "#F2E5A2", "#F89883", "D96666",
    "#002E40", "#2A5769", "#FFFFFF", "#FABD4A", "FA9600",
    "#FFFEFC", "#E2E3DF", "#515B5E", "#2E3233", "CAF200",
    "#FFF0A3", "#B8CC6E", "#4B6000", "#E4F8FF", "004460",
    "#3B596A", "#427676", "#3F9A82", "#A1CD73", "ECDB60",
    "#F2E6CE", "#8AB39F", "#606362", "#593325", "1D1D1F",
    "#212B40", "#C2E078", "#FFFFFF", "#BADCDD", "547B97",
    "#0B3C4D", "#0E5066", "#136480", "#127899", "1A8BB3",
    "#222130", "#464D57", "#D4E8D3", "#FFFCFB", "ED8917",
    "#B33600", "#FF8A00", "#FFC887", "#CC5400", "B31E00",
    "#012530", "#28544B", "#ACBD86", "#FFD6A0", "FF302C",
    "#2E95A3", "#50B8B4", "#C6FFFA", "#E2FFA8", "D6E055",
    "#112F41", "#068587", "#4FB99F", "#F2B134", "ED553B",
    "#202B30", "#4E7178", "#4FA9B8", "#74C0CF", "F1F7E2",
    "#302B2F", "#696153", "#FFA600", "#9BB58F", "FFD596",
    "#458C6B", "#F2D8A7", "#D9A86C", "#D94436", "A62424",
    "#22475E", "#75B08A", "#F0E797", "#FF9D84", "FF5460",
    "#FFAA5C", "#DA727E", "#AC6C82", "#685C79", "455C7B",
    "#686E75", "#9BAAC1", "#82787B", "#E4F1DB", "AAC19B",
    "#F0C755", "#E2AD3B", "#BF5C00", "#901811", "5C110F",
    "#FFFBDC", "#BFBCA5", "#7F7D6E", "#3F3E37", "E5E2C6",
    "#BEBEBE", "#F1E4D8", "#594735", "#94C7BA", "D8F1E4",
    "#1B1E26", "#F2EFBD", "#B6D051", "#70A99A", "2F6D7A",
    "#F7E4A2", "#A7BD5B", "#DC574E", "#8DC7B8", "ED9355",
    "#70E8CB", "#FFE9C7", "#FF5B5B", "#545454", "2D2D2F",
    "#17111A", "#321433", "#660C47", "#B33467", "CCBB51",
    "#2B2E2E", "#595855", "#A2ABA5", "#CAE6E8", "313F54",
    "#023B47", "#295E52", "#F2E085", "#FCAB55", "EE7F38",
    "#302C29", "#D1D1BC", "#A7C4BB", "#6C8C84", "466964",
    "#212629", "#067778", "#49B8A8", "#85EDB6", "D9E5CD",
    "#334D5C", "#45B29D", "#EFC94C", "#E27A3F", "DF4949",
    "#2C3E50", "#FC4349", "#6DBCDB", "#D7DADB", "FFFFFF",
    "#35262D", "#FFFBFF", "#E8ECED", "#A4B7BB", "76A0B0",
    "#61E8D2", "#FCEEB9", "#302F25", "#704623", "BBE687",
    "#E1E6B9", "#C4D7A4", "#ABC8A4", "#375D3B", "183128",
    "#C98B2F", "#803C27", "#C56520", "#E1B41B", "807916",
    "#A3D9B0", "#93BF9E", "#F2F0D5", "#8C8474", "40362E",
    "#524656", "#CF4747", "#EA7A58", "#E4DCCB", "A6C4BC",
    "#5C2849", "#A73E5C", "#EC4863", "#FFDA66", "1FCECB",
    "#0EEAFF", "#15A9FA", "#1B76FF", "#1C3FFD", "2C1DFF",
    "#010000", "#393845", "#9B96A3", "#5C0009", "940315",
    "#468071", "#FFE87A", "#FFCA53", "#FF893B", "E62738",
    "#404040", "#024959", "#037E8C", "#F2EFDC", "F24C27",
    "#FF765E", "#C2AE8B", "#FCCF65", "#FFE5C6", "B7BDC4",
    "#003647", "#00717D", "#F2D8A7", "#A4A66A", "515932",
    "#FAFAC0", "#C4BE90", "#8C644C", "#594D37", "293033",
    "#2B3A42", "#3F5765", "#BDD4DE", "#EFEFEF", "E74C3C",
    "#3B3B3B", "#A8877E", "#FFA49D", "#FF7474", "FF476C",
    "#0A3A4A", "#196674", "#33A6B2", "#9AC836", "D0E64B",
    "#FFA340", "#38001C", "#571133", "#017A74", "00C2BA",
    "#DCEBDD", "#A0D5D6", "#789AA1", "#304345", "AD9A27",
    "#588C7E", "#F2E394", "#F2AE72", "#D96459", "8C4646",
    "#F0E6B1", "#B5D6AA", "#99A37A", "#70584B", "3D3536",
    "#2F400D", "#8CBF26", "#A8CA65", "#E8E5B0", "419184",
    "#010712", "#13171F", "#1C1F26", "#24262D", "961227",
    "#403F33", "#6E755F", "#AFC2AA", "#FFDEA1", "E64C10",
    "#C74029", "#FAE8CD", "#128085", "#385052", "F0AD44",
    "#CFF09E", "#A8DBA8", "#79BD9A", "#3B8686", "0B486B",
    "#E0401C", "#E6B051", "#272F30", "#F7EDB7", "9E2B20",
    "#FFE2C5", "#FFEEDD", "#FFDDAA", "#FFC484", "FFDD99",
    "#FFFFE4", "#F2E5BD", "#B9BF8E", "#A69F7C", "8C6865",
    "#5C8A2D", "#AFD687", "#FFFFFF", "#00C3A9", "008798",
    "#4F3130", "#FF1F3D", "#5BE3E3", "#FDFFF1", "8B9698",
    "#D23600", "#D95100", "#DE6D00", "#EE8900", "FCA600",
    "#FFFFFA", "#A1A194", "#5B605F", "#464646", "FF6600",
    "#F34A53", "#FAE3B4", "#AAC789", "#437356", "1E4147",
    "#2A7A8C", "#176273", "#063540", "#E6D9CF", "403D3A",
    "#21455B", "#567D8C", "#A59E8C", "#8C8372", "F2F2F2",
    "#012340", "#026873", "#83A603", "#BBBF45", "F2F0CE",
    "#FDFF98", "#A7DB9E", "#211426", "#6B073B", "DA8C25",
    "#002F36", "#142426", "#D1B748", "#EDDB43", "FFFD84",
    "#420000", "#600000", "#790000", "#931111", "BF1616",
    "#3C989E", "#5DB5A4", "#F4CDA5", "#F57A82", "ED5276",
    "#23A38F", "#B7C11E", "#EFF1C2", "#F0563D", "2E313D",
    "#F5ECD9", "#2BACB5", "#B4CCB9", "#E84D5B", "3B3B3B",
    "#A5EB3C", "#60C21E", "#159E31", "#53DB50", "C5FFCB",
    "#263138", "#406155", "#7C9C71", "#DBC297", "FF5755",
    "#0A111F", "#263248", "#7E8AA2", "#E3E3E3", "C73226",
    "#003B59", "#00996D", "#A5D900", "#F2E926", "FF930E",
    "#00A19A", "#04BF9D", "#F2E85C", "#F53D54", "404040",
    "#324152", "#47535E", "#796466", "#C1836A", "DEA677",
    "#036F73", "#84CDC2", "#FEF2D8", "#F18C79", "EF504F",
    "#174040", "#888C65", "#D9CA9C", "#D98162", "A65858",
    "#56797F", "#87A0A4", "#FCFBDC", "#F2DDB6", "A6937C",
    "#A8BAA9", "#FFF5CF", "#DBCDAD", "#B39C7D", "806854",
    "#60655F", "#AB9675", "#FFE0C9", "#D4CCBA", "CF8442",
    "#BDDFB3", "#009D57", "#2C372E", "#0F2925", "465F3F",
    "#3E3947", "#735360", "#D68684", "#F1B0B0", "EBD0C4",
    "#0A7B83", "#2AA876", "#FFD265", "#F19C65", "CE4D45",
    "#FFFFFF", "#F4921E", "#858585", "#C5D2DB", "3E6B85",
    "#11151E", "#212426", "#727564", "#B9AA81", "690C07",
    "#000000", "#910000", "#CBB370", "#FFFBF1", "21786C",
    "#F78F00", "#C43911", "#75003C", "#37154A", "0F2459",
    "#003354", "#91BED4", "#D9E8F5", "#FFFFFF", "F26101",
    "#3DA8A4", "#7ACCBE", "#FFFFF7", "#FF99A1", "FF5879",
    "#64C733", "#F0F0F0", "#3E879E", "#57524D", "36302B",
    "#343844", "#2AB69D", "#E65848", "#FDC536", "FCF2D7",
    "#E34517", "#F5FF53", "#B4E85E", "#00BD72", "0B4239",
    "#A84B3A", "#FF9F67", "#233138", "#FFF7F5", "4C646B",
    "#59535E", "#FAEEFF", "#F1BAF3", "#5D4970", "372049",
    "#FF6F22", "#D9984F", "#FFE8A9", "#3E4237", "32948A",
    "#5D7370", "#7FA6A1", "#B8D9B8", "#D6EDBD", "FFF5BC",
    "#FFBE00", "#FFDC00", "#FFD10F", "#FFDE20", "E8CA00",
    "#003840", "#005A5B", "#007369", "#008C72", "02A676",
    "#E1E6FA", "#C4D7ED", "#ABC8E2", "#375D81", "183152",
    "#BA2F1D", "#FFF8A4", "#F5E67F", "#264A59", "1E2C30",
    "#222526", "#FFBB6E", "#F28D00", "#D94F00", "80203B",
    "#EBD096", "#D1B882", "#5D8A66", "#1A6566", "21445B",
    "#F00807", "#5F6273", "#A4ABBF", "#CCC9D1", "E2E1E9",
    "#DFE0AF", "#A4BAA2", "#569492", "#41505E", "383245",
    "#152737", "#2B4E69", "#799AA5", "#FFFFF0", "682321",
    "#C44C51", "#FFB6B8", "#FFEFB6", "#A2B5BF", "5F8CA3",
    "#5ADED4", "#4DAAAB", "#26596A", "#163342", "6C98A1",
    "#FF5B2B", "#B1221C", "#34393E", "#8CC6D7", "FFDA8C",
    "#3D4D4D", "#99992E", "#E6E666", "#F2FFBF", "800033",
    "#242424", "#437346", "#97D95C", "#D9FF77", "E9EB9B",
    "#FFEBB0", "#FFB05A", "#F84322", "#C33A1A", "9F3818",
    "#4D2B2F", "#E57152", "#E8DE67", "#FFEFC3", "C0CCAB",
    "#A82221", "#DB5E31", "#EDA23E", "#F2CB67", "BFB840",
    "#3B3140", "#BFB8A3", "#F2E0C9", "#F2B9AC", "D97E7E",
    "#43464D", "#9197A6", "#D3DCF2", "#7690CF", "48577D",
    "#EFDFBB", "#9EBEA6", "#335D6A", "#D64F2A", "7A8A7F",
    "#000001", "#313634", "#C7CECF", "#5C0402", "941515",
    "#334D5C", "#45B29D", "#EFC94C", "#E27A3F", "DF5A49",
    "#F5F4E1", "#D6C9B5", "#B4AA97", "#D44917", "82877A",
    "#19162B", "#1C425C", "#6ABDC4", "#F0E4C5", "D6C28F",
    "#00132B", "#7F9DB0", "#C5E2ED", "#FFFFFF", "F95900",
    "#1F3642", "#6D968D", "#B6CCB8", "#FFE2B3", "56493F",
    "#08A689", "#82BF56", "#C7D93D", "#E9F2A0", "F2F2F2",
    "#DE3961", "#A4E670", "#FFFFDC", "#B3EECC", "00ADA7",
    "#849972", "#D9D094", "#A6A23E", "#4F2F1D", "8F5145",
    "#F41C54", "#FF9F00", "#FBD506", "#A8BF12", "00AAB5",
    "#00585F", "#009393", "#F5F3DC", "#454445", "FF5828",
    "#FF6138", "#FFFF9D", "#BEEB9F", "#79BD8F", "00A388",
    "#140B04", "#332312", "#B59D75", "#E3D2B4", "FFF7EA",
    "#ED3B3B", "#171F26", "#77B59C", "#F2E7B1", "635656",
    "#46594B", "#A6977C", "#D9B384", "#734F30", "260B01",
    "#CCB8A3", "#FF8FB1", "#FFF5EA", "#4E382F", "B29882",
    "#B70000", "#FFFFFF", "#FFCA3D", "#94C4F4", "0092B3",
    "#053B44", "#06736C", "#A53539", "#B9543C", "EAD075",
    "#E8C1B9", "#FFB3AB", "#FFCAB8", "#E8B69C", "FFCEAB",
    "#E7F2DF", "#69043B", "#59023B", "#231E2D", "161726",
    "#E82B1E", "#E5DEAF", "#A0B688", "#557A66", "453625",
    "#F1E6D4", "#BA3D49", "#791F33", "#9F9694", "E3E1DC",
    "#CED59F", "#F1EDC0", "#B1BEA4", "#647168", "282828",
    "#2C3E50", "#E74C3C", "#ECF0F1", "#3498DB", "646464",
    "#DE7047", "#FFDE8D", "#FFFFFF", "#CDDE47", "528540",
    "#8EAB99", "#40232B", "#D95829", "#D97338", "DEC085",
    "#E9662C", "#EBAF3C", "#00AC65", "#068894", "2B2B2B",
    "#46483C", "#A0AA8F", "#EBE3CB", "#FFFFFF", "F26101",
    "#170F0E", "#290418", "#505217", "#FFD372", "FFF1AF",
    "#263545", "#C4273C", "#D7DADB", "#6DBCDB", "FFFFFF",
    "#DCFAC0", "#B1E1AE", "#85C79C", "#56AE8B", "00968B",
    "#075807", "#097609", "#70AF1A", "#B9D40B", "E5EB0B",
    "#521000", "#712800", "#744E1D", "#879666", "F1D98C",
    "#261F26", "#3F3B40", "#6C7367", "#BFBF8A", "F2E086",
    "#2C3E50", "#FC4349", "#D7DADB", "#6DBCDB", "FFFFFF",
    "#506D7D", "#94CCB9", "#FFECA7", "#FFB170", "F07D65",
    "#3F4036", "#8DA681", "#F2E1C2", "#BF2806", "8C1D04",
    "#990700", "#CC542E", "#FF964F", "#FFCB7C", "787730",
    "#195073", "#7F8C1F", "#EE913F", "#F2E5BD", "9FD7C7",
    "#1B3E59", "#F2F0F0", "#FFAC00", "#BF0404", "730202",
    "#EA6045", "#F8CA4D", "#F5E5C0", "#3F5666", "2F3440",
    "#F95759", "#FDA099", "#FFFFFF", "#D9F3CB", "8AC2B0",
    "#265573", "#386D73", "#81A68A", "#9FBF8F", "D4D9B0",
    "#E1DA36", "#FFEA1B", "#6FE4DA", "#1DB0BC", "007BBC",
    "#013859", "#185E65", "#F9CC7F", "#F15C25", "9E1617",
    "#36CC7C", "#D6FFBE", "#94D794", "#228765", "77A668",
    "#94201F", "#D4421F", "#478A80", "#D9E061", "F08835",
    "#F16233", "#00B5B5", "#F0F0F0", "#3E4651", "5C6D7E",
    "#2E806C", "#76CC99", "#E0FFED", "#FF5F3A", "D2413C",
    "#00393B", "#00766C", "#44A18E", "#E5EDB6", "F6695B",
    "#734854", "#F2F2E9", "#D9D7C5", "#A69580", "736766",
    "#03497E", "#0596D5", "#9DEBFC", "#8D7754", "FEB228",
    "#F0E14C", "#FFBB20", "#FA7B12", "#E85305", "59CC0D",
    "#FE4365", "#FC9D9A", "#F9CDAD", "#C8C8A9", "83AF9B",
    "#00557C", "#186D94", "#3488AD", "#81C1DC", "BBE5F3",
    "#DEE8D7", "#918773", "#420A1A", "#240001", "4D493A",
    "#FFFFFF", "#CAC535", "#97AF25", "#158471", "41342C",
    "#041F3D", "#0B2E41", "#165751", "#448C61", "9AC16D",
    "#FA8C01", "#FF6405", "#577700", "#082400", "A0A600",
    "#78C0F9", "#FFDDCE", "#FFFFFF", "#FFDBE6", "FE86A4",
    "#351330", "#CC2A41", "#E7CAA4", "#759A8A", "524549",
    "#02151A", "#043A47", "#087891", "#C8C8C8", "B31D14",
    "#F34A53", "#FAE3B4", "#AAC789", "#437356", "1E4147",
    "#58838C", "#DAD7C7", "#BF996B", "#BF5841", "A61C1C",
    "#556354", "#E68F0D", "#8C948A", "#495450", "42423F",
    "#323640", "#5B6470", "#8C94A1", "#BDC7D6", "DFE2FF",
    "#FF0000", "#FF950B", "#2FA88C", "#DEEB00", "4B2C04",
    "#0F3D48", "#174C5B", "#366774", "#ECECE7", "E96151",
    "#3DBB7E", "#A3CD39", "#FBAC1D", "#F96C1E", "EE4036",
    "#23363B", "#A44F3F", "#F8983D", "#8D9151", "BBC946",
    "#4B5657", "#969481", "#D2C9B0", "#F4E3C1", "B6B835",
    "#E8980C", "#B1F543", "#F2FF00", "#FF5E00", "59BBAB",
    "#849696", "#FEFFFB", "#232D33", "#17384D", "FF972C",
    "#555555", "#7BB38E", "#F4F1D7", "#F8AB65", "F15C4C",
    "#1D3C42", "#67BFAD", "#F2EC99", "#F2C48D", "F25050",
    "#334D5C", "#45B29D", "#EFC94C", "#E27A3F", "DF4949",
    "#B8E1F2", "#249AA7", "#ABD25E", "#F8C830", "F1594A",
    "#FDEDD0", "#BCF1ED", "#FF634D", "#FD795B", "FFF0AA",
    "#FFFFFF", "#E5E1D1", "#52616D", "#2C343B", "C44741",
    "#FFFFF1", "#D5FF9B", "#8FB87F", "#5A7B6C", "374E5A",
    "#010340", "#0E1E8C", "#0003C7", "#1510F0", "1441F7",
    "#002A4A", "#17607D", "#FFF1CE", "#FF9311", "E33200",
    "#871E31", "#CCC097", "#9E9D7B", "#687061", "262626",
    "#F16663", "#F48D6C", "#F2E07B", "#8ABE9B", "4A6D8B",
    "#001F11", "#204709", "#0C8558", "#FFD96A", "FF4533",
    "#1D1626", "#F2E0BD", "#BFAA8F", "#8C786C", "594C4C",
    "#685D47", "#913420", "#1E2729", "#C1D9C5", "FEEFB1",
    "#1D7561", "#FC8448", "#FF4138", "#A8282B", "38141B",
    "#BF0633", "#FF484E", "#FF9273", "#D1D0B4", "E5ECED",
    "#8E9E63", "#E6DBB0", "#F5EED7", "#C4BCA0", "176573",
    "#665446", "#809994", "#AECCB6", "#DEF2C4", "E6683F",
    "#3D0D26", "#660A3E", "#891C56", "#B0276F", "C93482",
    "#082136", "#00294D", "#004B8D", "#0068C4", "2998FF",
    "#3C4631", "#9A746F", "#F8A2AB", "#F1C6B3", "EAE9C0",
    "#FF534E", "#FFD7AC", "#BED194", "#499989", "176785",
    "#006D80", "#BDA44D", "#3C2000", "#84CECC", "78A419",
    "#352C2B", "#3C555C", "#9E9657", "#FFEBCD", "CD5510",
    "#2C3E50", "#FC4349", "#6DBCDB", "#D7DADB", "FFFFFF",
    "#523631", "#D1BE91", "#605E3A", "#4D462F", "592F39",
    "#18293B", "#5B5A56", "#F2DEA0", "#D0B580", "FFFBFF",
    "#C8DBB6", "#ECEBB7", "#CCC68A", "#B8B165", "827A5D ",
    "#7DA88C", "#EBE9A0", "#BED24B", "#859132", "35323C",
    "#E8574C", "#F27B29", "#E6A51B", "#D9CC3C", "399977",
    "#324032", "#B7C22C", "#FFFFE1", "#22A8B5", "2A3F42",
    "#B3A589", "#FFB896", "#FFF9B1", "#9AB385", "11929E",
    "#272433", "#343F4F", "#3D6066", "#77994D", "B2D249",
    "#250701", "#6D4320", "#B0925F", "#E7DEC0", "82ABB8",
    "#023550", "#028A9E", "#04BFBF", "#EFEFEF", "FF530D",
    "#594732", "#40342A", "#7A422E", "#D4CA9A", "EDE5AE",
    "#013C4D", "#BA5B22", "#DB913C", "#F0B650", "FAD46B",
    "#143840", "#5C6B63", "#A69E89", "#E0C297", "D96523",
    "#3FB8AF", "#7FC7AF", "#DAD8A7", "#FFB38B", "FF3F34",
    "#CA3995", "#F58220", "#FFDF05", "#BED73D", "61BC46",
    "#FFE1D0", "#FFBFB4", "#FF837E", "#FF4242", "BF1616",
    "#C4EEFF", "#7BA32D", "#094201", "#A41717", "C48726",
    "#001325", "#187072", "#90BD90", "#D7D8A2", "F2E4C2",
    "#1A4F63", "#068587", "#6FB07F", "#FCB03C", "FC5B3F",
    "#97B350", "#333230", "#736D61", "#BAAB90", "FFE5BA",
    "#403D33", "#807966", "#CCC2A3", "#8C0000", "590000",
    "#5F8A42", "#86AD59", "#F6FAA1", "#F28410", "D66011",
    "#BF355D", "#ED8168", "#FAB66A", "#F2DC86", "83BFA1",
    "#E1F03E", "#FFBA14", "#DB3A0F", "#A1003D", "630024",
    "#212226", "#45433F", "#687067", "#BDBB99", "F0EAC3",
    "#FE4365", "#FC9D9A", "#F9CDAD", "#C8C8A9", "83AF9B",
    "#293B47", "#5F7A87", "#FFFFFF", "#CBFF48", "00ADA9",
    "#282A33", "#697371", "#FFE7A6", "#F5BA52", "FA8000",
    "#0C304A", "#2B79A1", "#F3F4F1", "#85A71E", "BFD841",
    "#008B83", "#4DAE83", "#A0AE79", "#FFE499", "FF665E",
    "#5D7359", "#E0D697", "#D6AA5C", "#8C5430", "661C0E",
    "#324452", "#97BDBF", "#F2DFBB", "#F28705", "BF3604",
    "#EEEFB9", "#6ACFAE", "#369C93", "#232928", "B03831",
    "#332F45", "#015770", "#2A8782", "#9FD6AE", "FFFED2",
    "#2B2830", "#5C504F", "#ABAB8E", "#D9D7A3", "C7BE88",
    "#DC941B", "#EDC266", "#B6952C", "#E1D3A6", "E9A119",
    "#00305A", "#00448D", "#0074D9", "#4192D9", "7ABAF2",
    "#344459", "#485F73", "#5DA6A6", "#A9D9CB", "F2EAD0",
    "#060719", "#4D1B2F", "#9E332E", "#EB6528", "FC9D1C",
    "#96CEB4", "#FFEEAD", "#FF6F69", "#FFCC5C", "AAD8B0",
    "#05F2F2", "#04BFBF", "#EEF1D9", "#A60201", "7E100E",
    "#E6F1F5", "#636769", "#AAB3B6", "#6E7476", "4B4E50",
    "#DA0734", "#F1A20D", "#4AABB1", "#FCF3E7", "3F1833",
    "#202D44", "#FC4349", "#6DBCDB", "#D7DADB", "FFFFFF",
    "#CC3B37", "#398899", "#FFFCE8", "#FF857F", "CCC1A3",
    "#5DBEA9", "#EFEDDF", "#EF7247", "#4E3F35", "D1CBBA",
    "#FFC62D", "#E49400", "#DD5200", "#EFE38A", "91B166",
    "#B67D14", "#F2921F", "#F0B23E", "#A62409", "441208",
    "#C71B1B", "#D6BA8A", "#017467", "#E08F23", "0B0D0C",
    "#474143", "#A69E9D", "#E7E2DA", "#FFFFFF", "E7E8E7",
    "#435772", "#2DA4A8", "#FEAA3A", "#FD6041", "CF2257",
    "#6DD19D", "#99E89D", "#D0E8A1", "#FFF9C0", "D40049",
    "#FAF1D5", "#DEC9AC", "#CCA18B", "#11282D", "A5C4BB",
    "#000000", "#141414", "#1C1919", "#1A1716", "24201F",
    "#D5D8DD", "#5CA2BE", "#135487", "#2A4353", "989DA4",
    "#73161E", "#BF0F30", "#BFB093", "#037F8C", "0A2140",
    "#195962", "#F56F6C", "#FFFFFF", "#252932", "191C21",
    "#F8EFB6", "#FEBAC5", "#6CD1EA", "#FACFD7", "C2EAE9",
    "#91D6BC", "#768C6A", "#755F31", "#B37215", "FFBA4B",
    "#F2E6BB", "#DD4225", "#202724", "#63BD99", "F8FDD8",
    "#762B1B", "#807227", "#CCBF7A", "#FFEF98", "60B0A1",
    "#707864", "#C1D74E", "#F5FF7C", "#DFE6B4", "A6B89C",
    "#FFF3D2", "#97B48F", "#E87657", "#FF9B6F", "E8D495",
    "#33262E", "#733230", "#CC5539", "#E6D27F", "86A677",
    "#122430", "#273E45", "#FFFCE2", "#EBD2B5", "E63531",
    "#30394F", "#FF434C", "#6ACEEB", "#EDE8DF", "FFFBED",
    "#0A3A4A", "#196A73", "#32A6A6", "#A1BF36", "C8D94A",
    "#FFF7CC", "#CCC28F", "#70995C", "#33664D", "142933",
    "#43464D", "#9197A6", "#D3DCF2", "#7690CF", "48577D",
    "#DFE0AF", "#A4BAA2", "#569492", "#41505E", "383245",
    "#B52841", "#FFC051", "#FF8939", "#E85F4D", "590051",
    "#473C35", "#A36D5C", "#9C968B", "#D9CEAD", "8A866A",
    "#DB4C39", "#2D3638", "#109489", "#44D487", "D0DB86",
    "#6F8787", "#AEC2AE", "#E6DFAE", "#B0B57B", "888F51",
    "#C8385A", "#FFCF48", "#ECEABE", "#1FCECB", "1CA9C9",
    "#42282E", "#75A48B", "#D9CFB0", "#DC9B74", "D6665A",
    "#362F2D", "#4C4C4C", "#94B73E", "#B5C0AF", "FAFDF2",
    "#98293A", "#B14A58", "#C86C6B", "#DE9D76", "EFC77F",
    "#C1D301", "#76AB01", "#0E6A00", "#083500", "042200",
    "#453F22", "#7A6B26", "#CCAD5C", "#A1191F", "4E1716",
    "#541E32", "#8E3557", "#88A33E", "#C2BD86", "F7F2B2",
    "#2B1B2E", "#54344D", "#FFFFD6", "#B89E95", "6E444F",
    "#6EC1A5", "#9FBEA6", "#F5D3A3", "#FF9F88", "FB7878",
    "#2F252C", "#D3CCB2", "#99AD93", "#6E6751", "5C3122",
    "#BE333F", "#F2E9CE", "#C8C5B1", "#939F88", "307360",
    "#F0F1F2", "#232625", "#647362", "#B3D929", "D2D9B8",
    "#FA2B31", "#FFBF1F", "#FFF146", "#ABE319", "00C481",
    "#09455C", "#527E7C", "#F5FFCC", "#E0EB6E", "C4D224",
    "#F2DA91", "#F2B950", "#F29D35", "#D96704", "BF4904",
    "#A2CFA5", "#E0E7AB", "#F5974E", "#E96B56", "D24344",
    "#150033", "#310D42", "#5C2445", "#AB6946", "FFCE4C",
    "#23A38F", "#B7C11E", "#EFF1C2", "#F0563D", "2E313D",
    "#FF2468", "#E0D4B1", "#FFFFE3", "#00A5A6", "005B63",
    "#65A683", "#218777", "#3F585F", "#47384D", "F53357",
    "#000623", "#28475C", "#4A6C74", "#8BA693", "F0E3C0",
    "#E65322", "#D19552", "#B8BF73", "#B6DB83", "FFF991",
    "#112F41", "#068587", "#6FB07F", "#FCB03C", "FC5B3F",
    "#C89B41", "#A16B2B", "#77312B", "#1C2331", "152C52",
    "#C24366", "#D9C099", "#FFF8D8", "#A8E0BA", "00ADA7",
    "#CC0000", "#006600", "#FFFFEC", "#9C9178", "6C644F",
    "#3D0319", "#720435", "#C1140E", "#FC5008", "32241B",
    "#CFC7A4", "#5A9E94", "#005275", "#002344", "A38650",
    "#FFEBC3", "#CC3A00", "#FF3600", "#FF851B", "800C00",
    "#EFC164", "#F3835D", "#F35955", "#286275", "00434C",
    "#E9F29D", "#B7C29D", "#878E8F", "#67617A", "51456B",
    "#445859", "#03A696", "#49C4BE", "#F1F2E4", "FF7746",
    "#FA726C", "#FFD794", "#BAD174", "#3BA686", "5F6F8C",
    "#4D2B1F", "#635D61", "#7992A2", "#97BFD5", "BFDCF5",
    "#CC4D00", "#E6CF73", "#668059", "#264D4D", "00CCB3",
    "#4385F5", "#DC4437", "#FCBE1F", "#109D59", "FFFFFF",
    "#271F2E", "#A4A680", "#F2EBC9", "#D9B166", "A66B38",
    "#0B2C3C", "#FF6666", "#DADFE1", "#FFFFFF", "444444",
    "#CFF09E", "#A8DBA8", "#79BD9A", "#3B8686", "0B486B",
    "#302B26", "#A6B827", "#EDE9DD", "#98D3D4", "594E7A",
    "#4B0505", "#720707", "#BFB694", "#004659", "00292B",
    "#B52C38", "#EBD1B0", "#536682", "#D9964B", "DE6846",
    "#F2F1DF", "#F2B705", "#F2C84B", "#BF820F", "734002",
    "#26140C", "#3D2216", "#784E3D", "#AB8574", "D6BCB1",
    "#26221D", "#8C2C0F", "#E6E5B8", "#BFB38D", "402D1F",
    "#1F8181", "#F2BC79", "#F28972", "#BF1B39", "730240",
    "#002635", "#013440", "#AB1A25", "#D97925", "EFE7BE",
    "#8EC447", "#FFFFFF", "#96D3D4", "#636466", "2D2D2E",
    "#2D1E1E", "#4B3C37", "#96A576", "#CDE196", "FFFFBE",
    "#F06060", "#FA987D", "#F7F2CB", "#72CCA7", "10A296",
    "#1D8281", "#44BF87", "#FBD258", "#F29A3F", "DB634F",
    "#DEDE91", "#EF9950", "#F34E52", "#C91452", "492449",
    "#6D8EAD", "#1F3447", "#1A0B07", "#362416", "CFCDB4",
    "#00CD73", "#008148", "#2D9668", "#3ECD8E", "004E2C",
    "#3D8080", "#628282", "#858383", "#A38282", "C28080",
    "#475159", "#839795", "#B2BDB7", "#CCC9C0", "F2F2F2",
    "#0E6870", "#C6B599", "#C65453", "#FFDDB4", "EDAA7D",
    "#CEF0B7", "#A8DBA8", "#79BD9A", "#3B8686", "0B486B",
    "#292C44", "#FF5349", "#F0F0F1", "#18CDCA", "4F80E1",
    "#272A2B", "#383737", "#473B39", "#692B28", "940500",
    "#D6C274", "#DB9E46", "#25706B", "#3D2423", "AB362E",
    "#FFA68F", "#FF4867", "#FFF9C8", "#B5EBB9", "18B29D",
    "#A1A16A", "#727D59", "#366353", "#133C40", "03212E",
    "#D45354", "#A9DC3A", "#2FCAD8", "#818B85", "CDCDC1",
    "#F14B6A", "#3D3C3E", "#22BDAF", "#BAD7D4", "F4F4F4",
    "#FFE2C5", "#FFEEDD", "#FFDDAA", "#FFC484", "FFDD99",
    "#9FFF4A", "#1ABF93", "#087363", "#004040", "2F1933",
    "#FFDB97", "#B28F4E", "#FFFDFB", "#466CB2", "97BBFF",
    "#991C00", "#E09A25", "#FFFCDB", "#008B83", "262B30",
    "#44281A", "#00ACAE", "#F5EFD5", "#F37606", "EE4717",
    "#FF5952", "#FCEEC9", "#96D6D9", "#4FAAC9", "176075",
    "#5C4B51", "#8CBEB2", "#F2EBBF", "#A5C88F", "EF847B",
    "#105F73", "#F7F3B2", "#C6CC33", "#F28322", "CC5404",
    "#137072", "#56B292", "#B7F5AB", "#FBFFC0", "BF223D",
    "#E3F23E", "#6C821C", "#A6A53F", "#E0E0AC", "33302E",
    "#00215E", "#003CAA", "#1967F7", "#5E4000", "AA7400",
    "#273A3D", "#54695C", "#AD9970", "#FFBF87", "FF8F60",
    "#FFAA00", "#C2B93E", "#808F5D", "#576157", "302F30",
    "#BE1405", "#F2DCAC", "#AABEAA", "#736E41", "413C2D",
    "#6B1229", "#C76A61", "#FAB99A", "#F7D9B5", "CCB1A7",
    "#2D9993", "#58B3A3", "#83BFA3", "#B0D9A8", "FFFCB6",
    "#334D5C", "#45B29D", "#EFC94C", "#E27A3F", "DF5A49",
    "#F30B55", "#010326", "#012840", "#54717F", "F2E6CE",
    "#2A3411", "#73662C", "#BC9847", "#FFDFB2", "6B0031",
    "#637D74", "#403D3A", "#8C3B3B", "#AB6937", "D4A960",
    "#010A26", "#011640", "#B6D6F2", "#FFFFFF", "E83338",
    "#924847", "#EB986C", "#E4C678", "#9C7885", "372C2C",
    "#022440", "#3F95AA", "#4EC6DE", "#EAE2DF", "F7572F",
    "#2B1D2E", "#323657", "#076473", "#54B087", "D6F567",
    "#052229", "#004043", "#BCC373", "#E3FF55", "D0D90C",
    "#4C514A", "#907A62", "#879796", "#755854", "B09880",
    "#1D2939", "#1CAF9A", "#FFFFFF", "#EE4F4B", "D1DC48",
    "#004B67", "#41CCB4", "#FFEA95", "#FF7C5D", "C70151",
    "#C0272D", "#FCFBE7", "#9FD3DA", "#008C9A", "05484F",
    "#213130", "#FF5E3D", "#C9C83E", "#FDFFF1", "559398",
    "#B1E4FC", "#366D78", "#39D5F1", "#FFFFFF", "D9FF03",
    "#DECE6C", "#FCF9B6", "#BFE3B5", "#5D826E", "262E2B",
    "#520A17", "#668F91", "#F5E6AC", "#AB8E5B", "52301C",
    "#2D3032", "#DD5F18", "#FBA922", "#F7F7F7", "404333",
    "#0C2538", "#2B434F", "#638270", "#BCC98E", "EDE059",
    "#E85066", "#F28E76", "#E6CEB0", "#5A8C81", "382837",
    "#BF2633", "#A6242F", "#D9CEAD", "#C0B18F", "011C26",
    "#002A4A", "#17607D", "#FFF1CE", "#FF9311", "E33200",
    "#0A8B91", "#485956", "#C4B98F", "#FFF9BC", "EEDF2E",
    "#B89A7B", "#9BBAAC", "#F2D649", "#D95D50", "DBDBDB",
    "#BD7938", "#8D4421", "#643001", "#532700", "3A1C00",
    "#E1E6FA", "#C4D7ED", "#ABC8E2", "#375D81", "183152",
    "#2E4259", "#F7483B", "#ECF0F1", "#03C8FA", "737373",
    "#364656", "#5D6B74", "#94A4A5", "#F2F5E9", "FF8C31",
    "#3E5916", "#93A605", "#F28705", "#F25C05", "E5EFFA",
    "#248077", "#74AD8D", "#C82754", "#F7BB21", "F9E2B7",
    "#20736A", "#8BD9CA", "#B1D95B", "#93A651", "403E34",
    "#D74B4B", "#DCDDD8", "#475F77", "#354B5E", "FFFFFF",
    "#252F33", "#415C4F", "#869C80", "#93C2CC", "CEEAEE",
    "#012840", "#79C7D9", "#9BF2EA", "#497358", "9DBF8E",
    "#EE7E94", "#F8B4C4", "#C7CAC9", "#D8505C", "41424",
    "#282828", "#505050", "#FFFFFF", "#2DCEDB", "F20000",
    "#004358", "#1F8A70", "#BEDB39", "#FF5347", "FD7400",
    "#470C3B", "#802F56", "#C0576F", "#E38679", "FFBD83",
    "#573328", "#B05A3A", "#FF8548", "#29332E", "0F1B1C",
    "#461F2D", "#E1FFBB", "#BAD47F", "#849C23", "52533F",
    "#333A40", "#4C5E5E", "#ADD0E5", "#CDE4FF", "729EBF",
    "#DE5605", "#F7A035", "#B1DEB5", "#EFECCA", "65ABA6",
    "#76D6D2", "#F9E270", "#EF6F56", "#F4EED8", "596B56",
    "#403E3F", "#F2F2F2", "#D9D9D9", "#9DAABB", "8C8C8C",
    "#059E9A", "#F4F2ED", "#F5A243", "#DB3E3B", "585857",
    "#FFBF41", "#EE8943", "#C02221", "#FFF4D3", "249CA9",
    "#024E76", "#39A6B2", "#FCE138", "#F5B824", "F08106",
    "#FF0067", "#FF3D6A", "#E7FF04", "#9CFF00", "56FF00",
    "#003540", "#0D3F40", "#487360", "#8FA671", "F2D795",
    "#FF493C", "#FFFFFF", "#B3ECEF", "#31C4F5", "ADEB41",
    "#244358", "#4A8B87", "#7CBCAE", "#F0D4AF", "C5252B",
    "#EA5930", "#F8AF1E", "#F5E5C0", "#097380", "372560",
    "#A1DBB2", "#FEE5AD", "#FACA66", "#F7A541", "F45D4C",
    "#2C4A47", "#6C9A7F", "#BB523D", "#C89D11", "81810B",
    "#F0F1F2", "#232625", "#647362", "#FF5629", "D2D9B8",
    "#7C9B5F", "#B8D197", "#E3FFF3", "#9BDEC7", "568F84",
    "#E54E45", "#DBC390", "#F2F2EF", "#13A3A5", "403833",
    "#77A7FB", "#E57368", "#FBCB43", "#34B67A", "FFFFFF",
    "#001A2E", "#8F0000", "#FFFFFF", "#8A874B", "41594F",
    "#312F40", "#49A69C", "#EFEAC5", "#E89063", "BF5656",
    "#047C8C", "#018B8D", "#F3BF81", "#F49B78", "F1706D",
    "#00303E", "#7096AD", "#C1D1DE", "#FFF9EF", "EC4911",
    "#2D6891", "#70A0BF", "#F5EEDC", "#DC4C1A", "F0986C",
    "#040002", "#3D1309", "#E8B96A", "#BC5D15", "5C0F00",
    "#8B929C", "#5E6070", "#514454", "#3B313D", "FF2479",
    "#142D58", "#447F6E", "#E1B65B", "#C8782A", "9E3E17",
    "#22104D", "#2D1E5E", "#483A85", "#7067AB", "A49CFA",
    "#919C86", "#9E373E", "#2B2E36", "#D1B993", "C45A3B",
    "#332F45", "#015770", "#2A8782", "#9FD6AE", "FFFED2",
    "#37C78F", "#FEE293", "#FF4D38", "#CC2249", "380C2A",
    "#47282C", "#8C8468", "#C9B37F", "#DBDAB7", "C4C49C",
    "#14191A", "#2D2B21", "#A69055", "#CCB287", "FFB88C",
    "#F5E3CD", "#696158", "#B6A898", "#877D71", "504A43",
    "#005151", "#009393", "#F56200", "#454445", "969692",
    "#D95F47", "#FFF2C1", "#80A894", "#106153", "072C36",
    "#9E352C", "#E6E8A9", "#93C28C", "#2E5A5C", "2B2623",
    "#03013A", "#334A94", "#6B9EDF", "#83C3F2", "99E6FF",
    "#372A26", "#4D4D4D", "#6DA0A7", "#9ED5A8", "C7F5FF",
    "#03658C", "#022E40", "#F2B705", "#F28705", "F25C05",
    "#FF3B16", "#E87826", "#E8BA4A", "#80A272", "003045",
    "#00748E", "#E3DFBB", "#F4BA4D", "#E3753C", "DA3B3A",
    "#25401E", "#56732C", "#84A63C", "#B8D943", "EAF2AC",
    "#449BB5", "#043D5D", "#EB5055", "#68C39F", "FFFCF5",
    "#108F97", "#FF8B6B", "#FFE39F", "#16866D", "103636",
    "#1A4F63", "#068F86", "#6FD57F", "#FCB03C", "FC5B3F",
    "#381C19", "#472E29", "#948658", "#F0E99A", "362E29",
    "#D7E8F7", "#BBD0E3", "#9CB7CF", "#6A8BAB", "375D81",
    "#0F1C28", "#136972", "#67BFA7", "#F3CF5B", "F07444",
    "#FFFFFF", "#4EA9A0", "#969514", "#FE9C03", "FCDE8E",
    "#2F2D30", "#656566", "#65537A", "#51386E", "2A2333",
    "#4C2916", "#F05A28", "#FBAF3F", "#38B449", "FFFFFF",
    "#132537", "#006C80", "#EBCAB8", "#FE8315", "FA3113",
    "#ECEEE1", "#A8DACF", "#F05B4F", "#D8403A", "221E1F",
    "#00305A", "#004B8C", "#0074D9", "#4192D9", "7ABAF2",
    "#72CF3F", "#85FF00", "#23E000", "#2FB81B", "00FF1C",
    "#45CEEF", "#FFF5A5", "#FFD4DA", "#99D2E4", "D8CAB4",
    "#FF5B00", "#A1716C", "#728296", "#439AAB", "00CABD",
    "#EB6C2D", "#D9C8A2", "#939C80", "#496158", "232F38",
    "#D94214", "#FFF2C1", "#80A894", "#52736B", "093844",
    "#4D1B2F", "#9E332E", "#EB6528", "#FC9D1C", "FFCA50",
    "#FFEEB0", "#9AE8A4", "#C7C12D", "#F76245", "ED1C43",
    "#FFFAED", "#D4DBFF", "#879AC9", "#242942", "FF8800",
    "#022840", "#013440", "#517360", "#9DA67C", "F2DC99",
    "#331A0F", "#519994", "#BA4B3C", "#EEDDAA", "789F63",
    "#577867", "#EDCE82", "#D68644", "#AB3229", "662845",
    "#435A66", "#88A6AF", "#F5F2EB", "#D9CDB8", "424342",
    "#FF8840", "#958D4F", "#737B55", "#595540", "513E38",
    "#9D805A", "#EBC99D", "#FFE6C5", "#9DCEEA", "4B809E",
    "#272D40", "#364659", "#55736D", "#9DBF8E", "D0D991",
    "#23A38F", "#B7C11E", "#EFF1C2", "#F0563D", "2E313D",
    "#98C000", "#3D4C53", "#EA2E49", "#FFE11A", "0CDBE8",
    "#A20E30", "#E93C4F", "#DCDCD4", "#ADBCC3", "2D4255",
    "#1C2640", "#263357", "#384C80", "#4E6AB3", "5979CD",
    "#D94214", "#FFF2C1", "#80A894", "#52736B", "093844",
    "#3B596A", "#427676", "#3F9A82", "#A1CD73", "ECDB60",
    "#1E1E1F", "#424143", "#67666A", "#807F83", "CBC9CF",
    "#E04946", "#3BA686", "#B6D15D", "#FFD495", "FA847E",
    "#FFEBB0", "#FFB05A", "#F84322", "#C33A1A", "9F3818",
    "#FFA136", "#FF814A", "#E6635A", "#785D6B", "534557",
    "#CDCF91", "#EBEACC", "#D6D5B8", "#6D7D80", "41545E",
    "#011526", "#011C40", "#4E8DA6", "#F2EA79", "F2B33D",
    "#353230", "#3F4E51", "#7B8F70", "#99B2BE", "F6F4EA",
    "#063559", "#0D8C7F", "#8FBF4D", "#F2D13E", "D95929",
    "#158000", "#199900", "#20BF00", "#24D900", "29FF00",
    "#0B0D0E", "#137074", "#7EB7A3", "#F1DDBB", "EC6766",
    "#02151A", "#043A47", "#087891", "#C8C8C8", "B31D14",
    "#59361F", "#5C992E", "#A3CC52", "#E6E673", "FF5933",
    "#FE4365", "#FC9D9A", "#F9CDAD", "#C8C8A9", "83AF9B",
    "#4B1E18", "#F9E5C2", "#BBB082", "#829993", "4F5D4E",
    "#032843", "#1F595B", "#508C6D", "#71A670", "A6DB89",
    "#191724", "#4C4547", "#8C594E", "#D18952", "FDB157",
    "#191919", "#182828", "#60702D", "#AAB232", "E6FA87",
    "#212A3F", "#434F5B", "#F2F2F2", "#8AB839", "2E2E2E",
    "#004158", "#026675", "#038B8B", "#F1EEC9", "F09979",
    "#023059", "#3F7EA6", "#F2F2F2", "#D99E32", "BF5E0A",
    "#F21E52", "#FFFFFF", "#3D3B42", "#0C6F73", "63CFD4",
    "#452743", "#E7635E", "#F8E9A8", "#89E0AD", "00928C",
    "#FAAD63", "#D1714D", "#785E48", "#39403B", "3D1C24",
    "#4C0016", "#FFF7EB", "#DCCEA7", "#A17345", "104F53",
    "#BF2431", "#F24150", "#2A4557", "#3B848C", "EFF2E4",
    "#3B3013", "#8F6031", "#E88833", "#9C0C0A", "FDF3C1",
    "#1E2422", "#88BEB1", "#FF006D", "#DAFFFF", "718A94",
    "#F1F4F7", "#AF9F7B", "#775E43", "#40413C", "251C17",
    "#00182E", "#0C6BA1", "#D4D6D4", "#FFFDEB", "FF7500",
    "#FFAB4A", "#CCBAAB", "#1E2129", "#3D5E6E", "47A3A3",
    "#66B3A7", "#C0D4B6", "#EEF0BD", "#F0563D", "2C2F3B",
    "#332525", "#907465", "#EDC5B5", "#878C6D", "63674A",
    "#F04C16", "#DBDBD0", "#EDBD1F", "#4CB09C", "313B4A",
    "#2B211D", "#611C26", "#C5003E", "#8EB7A8", "F1E4B7",
    "#1A1F2B", "#30395C", "#4A6491", "#85A5CC", "D0E4F2",
    "#03497E", "#0596D5", "#9DEBFC", "#999999", "FE4B28",
    "#2F4159", "#465E73", "#88A649", "#F2ECE4", "D98841",
    "#323A46", "#22282F", "#EB4A33", "#FFFFFF", "E9F0F5",
    "#2C3E50", "#FC4349", "#6DBCDB", "#D7DADB", "FFFFFF",
    "#F29727", "#E05723", "#B0382F", "#982E4B", "713045",
    "#4D584A", "#465943", "#428552", "#3E754E", "4C694B",
    "#47191C", "#59574B", "#829690", "#B5B09A", "E1E3CB",
    "#1D5123", "#B1C661", "#FFDA68", "#FE9257", "F64448",
    "#59323C", "#260126", "#F2EEB3", "#BFAF80", "8C6954",
    "#4E0805", "#9E0522", "#FFF4D4", "#B8C591", "447622",
    "#424862", "#FB9A63", "#BFC4D5", "#F6FBF4", "FEBC98",
    "#FF2468", "#E0D4B1", "#FFFFE3", "#00A5A6", "005B63",
    "#1C2F40", "#4C6173", "#8094A6", "#D9D1BA", "F2E9D8",
    "#DFD7B7", "#EB7707", "#5C5445", "#3B2323", "9CBFC7",
    "#262E3B", "#9C8878", "#CFCAAA", "#FBF8FF", "992435",
    "#FFBC67", "#DA727E", "#AC6C82", "#685C79", "455C7B",
    "#404A69", "#516C8A", "#8AC0DE", "#FFFFFF", "FFAC00",
    "#485B61", "#4B8C74", "#74C476", "#A4E66D", "CFFC83",
    "#A31180", "#C42795", "#DE52B4", "#EA88CE", "FFBFE5",
    "#E64D2E", "#FFF5F1", "#7893AD", "#576B9C", "2D2A52",
    "#BF0436", "#8C0327", "#590219", "#F2CBA1", "8C674C",
    "#CF5B6F", "#FFF8C8", "#CAD9B1", "#8FB3A0", "648991",
    "#341D44", "#744D90", "#BB8CDD", "#3E4417", "88904D",
    "#00293E", "#003D4E", "#006269", "#00918F", "00BAB5",
    "#43212E", "#D9666F", "#F2D57E", "#A9A688", "516057",
    "#2A3B30", "#ABFFD1", "#EBFFF5", "#9DFEFF", "273B40",
    "#A63343", "#E65159", "#F5E9DB", "#F4F7CF", "BAD984",
    "#1BA68C", "#54BFAC", "#F2EDA7", "#F2E530", "D94625",
    "#1A2A40", "#3F7369", "#F2DEA0", "#CE5251", "EA895E",
    "#1E9382", "#70A758", "#EFF1C2", "#F0563D", "2E313D",
    "#A991E8", "#FFB4BB", "#ACF7FF", "#A2E891", "FFEDAE",
    "#225B66", "#17A3A5", "#8DBF67", "#FCCB5F", "FC6E59",
    "#282624", "#BFB7AA", "#403D39", "#807A71", "ABA398",
    "#334D5C", "#45B29D", "#EFC94C", "#E27A3F", "DF4949",
    "#440008", "#605521", "#988432", "#D9A54E", "9E3711",
    "#649670", "#36291E", "#69AD6C", "#92E67C", "C5FF84",
    "#42342C", "#738076", "#B2B39B", "#DFE5E1", "294359",
    "#1A3838", "#3F7A51", "#82A352", "#D1C062", "FFBE59",
    "#7D8C22", "#B3BF67", "#F2E49B", "#D9DFF4", "6791BF",
    "#8A7D6D", "#2D2D38", "#E86E48", "#FFFFE8", "9CC9C9",
    "#CFC949", "#FFF5BF", "#A9E6C4", "#6AB39F", "665841",
    "#A1172D", "#FDFFBA", "#A7DB9E", "#275C57", "1F1B19",
    "#FF6C0D", "#F29E00", "#E6C10F", "#44996F", "216273",
    "#2C3E50", "#FA4248", "#D7DADB", "#6DBCDB", "FFFFFF",
    "#627369", "#99B397", "#E2F2C6", "#91CCAD", "376266",
    "#04496E", "#66CAFF", "#A3FC7E", "#70D44A", "2C6B0F",
    "#1BA68C", "#97BF3F", "#F2ECD8", "#F2B035", "F2522E",
    "#A2D9B1", "#7CBF9E", "#F2F1B9", "#8C8575", "193741",
    "#024959", "#037E8C", "#F2EFDC", "#E74C30", "363636",
    "#212625", "#9CA6A2", "#D0D9D6", "#BF0404", "C2C6AF",
    "#00FFFF", "#00FF00", "#FFFF00", "#FF5100", "FF007C",
    "#212629", "#CDCF19", "#FFF77D", "#96C4AB", "CF2A56",
    "#CFF9FF", "#BFC7BB", "#787051", "#332730", "57324F",
    "#98CACB", "#FDEFBE", "#F0542B", "#736E5B", "ABA68E",
    "#F2F1EB", "#BFB9A4", "#262222", "#802A30", "8C0303",
    "#65356B", "#AB434F", "#C76347", "#FFA24C", "519183",
    "#78BF82", "#A4D17C", "#CFD96C", "#EBD464", "FFD970",
    "#806265", "#FFA256", "#F7DD77", "#E0D054", "ABA73C",
    "#8F323C", "#123943", "#80BDDB", "#4189AB", "C98127",
    "#683820", "#8C9A89", "#E7D6A2", "#BEAA65", "9A8234",
    "#021B21", "#032C36", "#065F73", "#E8DFD6", "FF2A1D",
    "#2D6C73", "#3FA693", "#B4D9CB", "#9ABF49", "C6D93B",
    "#141F26", "#2B4040", "#405950", "#A69E86", "F2D9BB",
    "#4A8279", "#003330", "#610400", "#003B06", "02730F",
    "#69B5E1", "#D4E4F5", "#EAF2F8", "#BEDBED", "000000",
    "#893660", "#EF7261", "#68D693", "#A0D7E2", "299CA8",
    "#073A59", "#2D9AA6", "#F2E2DC", "#F23322", "A61B1B",
    "#2A3A48", "#3E6372", "#B2D4DC", "#FAFAFF", "FF6900",
    "#F3BD8D", "#F1A280", "#BE6D6B", "#704A5B", "3E263C",
    "#1C2742", "#3C91C7", "#5A9ABE", "#95C5DE", "E0EEFB",
    "#426261", "#465A59", "#577573", "#739A97", "9AC1C0",
    "#002A4A", "#17607D", "#FFF1CE", "#FF9311", "D64700",
    "#589373", "#BFBD99", "#F2D6B3", "#C2512F", "241E1E",
    "#1F518B", "#1488C8", "#F7E041", "#E2413E", "B5292A",
    "#549494", "#E85649", "#232C2E", "#E6E8D2", "706558",
    "#392133", "#FFECBE", "#D9D098", "#C4AB6D", "AB7D3A",
    "#F0F0F0", "#1C1C1C", "#A2FDF5", "#1CCDC7", "27EDDF",
    "#011526", "#025959", "#027353", "#03A678", "03A696",
    "#004358", "#1F8A70", "#BEDB39", "#FFE11A", "FD7400",
    "#37465D", "#F2F2F2", "#9DC02E", "#779324", "051A37",
    "#580022", "#AA2C30", "#FFBE8D", "#487B80", "011D24",
    "#F9F9F9", "#03A678", "#E9EDEB", "#F44647", "00707F",
    "#800000", "#BF0000", "#E2D6C2", "#F6EDD8", "FFFFFF",
    "#F7F6AF", "#1B2124", "#D62822", "#97D6A6", "468263",
    "#432852", "#992255", "#FF3D4C", "#28656E", "00968F",
    "#444344", "#52BBB2", "#2B344D", "#EE5555", "F8F7EE",
    "#45334A", "#796B7D", "#CCC4B0", "#FFF1B5", "FFA3A3",
    "#5A4B53", "#9C3C58", "#DE2B5B", "#D86A41", "D2A825",
    "#14151C", "#0C242B", "#297059", "#84D66E", "D1FB7A",
    "#272D40", "#364659", "#55736D", "#9DBF8E", "D0D991",
    "#23A38F", "#B7C11E", "#EFF1C2", "#F0563D", "2E313D",
    "#2E064D", "#80176B", "#B356A1", "#59580B", "FFFF00",
    "#CC3333", "#FF9D33", "#F7F7F0", "#3EBBA7", "00747A",
    "#5C4B51", "#8CBEB2", "#F2EBBF", "#F3B562", "BD6060",
    "#0D3E58", "#1C848C", "#19C0C2", "#F3EDD6", "DA6260",
    "#022629", "#2A5945", "#FAFFED", "#E6DCC0", "B3371C",
    "#F4FAC7", "#7BAD8D", "#FFB159", "#F77F45", "C2454E",
    "#A2C1C6", "#86B1B7", "#AECBAD", "#CFDCB0", "D6E1D1",
    "#B0DAFF", "#325B80", "#64B7FF", "#586D80", "5092CC",
    "#0F808C", "#6C8C26", "#F2A71B", "#F26A1B", "D91818",
    "#FFBC6C", "#FE9F6C", "#BD716E", "#74495F", "3B2C4D",
    "#FF4D41", "#F2931F", "#E6CA21", "#91B321", "1E8C65",
    "#302821", "#453629", "#5C4837", "#8A735F", "BDA895",
    "#415457", "#5F7B7F", "#9ACCAF", "#E6EBC4", "F9F7C8",
    "#474143", "#A69E9D", "#E7E2DA", "#FFFFFF", "E7E8E7",
    "#805939", "#BD9962", "#E6CD7D", "#578072", "2D4B4D",
    "#03588C", "#1763A6", "#419CA6", "#54BF83", "8DBF41",
    "#00CCFF", "#A1FCFF", "#040438", "#004878", "C9FAFF",
    "#534C64", "#B7DECF", "#F0F3D7", "#7E858C", "D96557",
    "#7F7364", "#CBB08E", "#CBC1B7", "#789DCB", "646F7F",
    "#5C2849", "#A73E5C", "#EC7263", "#FE9551", "FFD285",
    "#FF0012", "#FF7D00", "#FFD900", "#5BE300", "0084B0",
    "#F24C32", "#F29471", "#FCDFA6", "#36B898", "3D7585",
    "#083157", "#0A6C87", "#459C97", "#92CCA5", "C9F0B1",
    "#DC941B", "#EDC266", "#B6952C", "#E1D3A6", "E9A119",
    "#323836", "#BAD1B5", "#DBE8CF", "#F0F7E8", "FFFEF5",
    "#081724", "#589494", "#8EBBB4", "#D0DCD0", "F5EED2",
    "#50781C", "#9CAD1C", "#EAF7E6", "#40A5DE", "0B5191",
    "#537F79", "#78A68F", "#CBD49C", "#FED457", "CB252A",
    "#F23C13", "#CBAB78", "#FFFFFF", "#898373", "1F1C17",
    "#450003", "#5C0002", "#94090D", "#D40D12", "FFED75",
    "#0770A2", "#82D9F7", "#FEFEFE", "#AEC844", "F36622",
    "#30394F", "#FF434C", "#6ACEEB", "#EDE8DF", "0E6569",
    "#FF6B6B", "#556270", "#C7F464", "#4ECDC4", "EDC8BB",
    "#D9B500", "#FFED9C", "#BFCC85", "#748F74", "454545",
    "#452E32", "#A34B1B", "#B5A187", "#EDDF9A", "A7CC31",
    "#2C2B33", "#596664", "#909980", "#CCC08D", "FF8A00",
    "#C21F1F", "#FFFFFC", "#E34446", "#FFFFDB", "E36D6F",
    "#282828", "#00AAB5", "#C1C923", "#F41C54", "F5F0F0",
    "#3A3F40", "#202627", "#151B1E", "#EFF4FF", "41444D",
    "#DEBB73", "#4D0017", "#010000", "#4D0F30", "9A002F",
    "#EB9328", "#FFA754", "#FFD699", "#FFF5DC", "4FA6B3",
    "#025E73", "#037F8C", "#D9D59A", "#D9BD6A", "590202",
    "#636266", "#E0CEA4", "#E8A579", "#7D6855", "42403E",
    "#FF0000", "#FF4000", "#FF7F00", "#FFBF00", "FFFF00",
    "#FFFFFF", "#74ADA6", "#1E5E6F", "#241B1F", "68A81E",
    "#5A0532", "#FF6745", "#FFC861", "#9DAE64", "27404A",
    "#ACCBBC", "#467847", "#E8E4C1", "#A60303", "730202",
    "#5C4B51", "#8CBEB2", "#F2EBBF", "#F3B562", "F06060",
    "#0D2557", "#93A8C9", "#FFFFFF", "#F5DED5", "558D96",
    "#F53C4A", "#565157", "#10CFC8", "#F2EEE7", "F5D662",
    "#FFD97B", "#E65029", "#A60027", "#660033", "191C26",
    "#595408", "#A6800D", "#A66D03", "#A63F03", "730C02",
    "#2E031F", "#590424", "#8C072B", "#BF0A2B", "DEEFC5",
    "#E0C882", "#A6874E", "#BFA169", "#D9B779", "F2D399",
    "#D88681", "#A67673", "#746566", "#535A5D", "324F54",
    "#FC297D", "#FB607A", "#FDA286", "#FDC188", "FEE78A",
    "#FFECA1", "#B3B27F", "#4C5E52", "#2F3436", "FFBE2C",
    "#D93312", "#B3AB82", "#45735F", "#394D47", "2C3233",
    "#324143", "#6595A3", "#C8E3E8", "#FCFFED", "B6C28B",
    "#477984", "#FEF5EB", "#C03C44", "#EEAA4D", "313E4A",
    "#334D5C", "#45B29D", "#EFC94C", "#E27A3F", "DF4949",
    "#630B11", "#33322F", "#2A2927", "#1E1D1C", "000000",
    "#D94214", "#FFF2C1", "#80A894", "#52736B", "093844",
    "#051E21", "#00302D", "#856434", "#F28C28", "FFAD4E",
    "#D7DADD", "#DDDEE3", "#E1E1E9", "#EDEFF4", "F2F3F8",
    "#BF495E", "#41A693", "#F2EC9B", "#D9CF48", "D9583B",
    "#067072", "#14A589", "#DECFA6", "#BAAE8C", "F94B06",
    "#423A38", "#47B8C8", "#E7EEE2", "#BDB9B1", "D7503E",
    "#730324", "#DFE3E6", "#B4C4D4", "#8BA2BD", "456382",
    "#537374", "#F9BD7F", "#EBD7A5", "#ADC9A5", "5C9E99",
    "#88B59E", "#B6DEC8", "#39464D", "#C04229", "ABD1AB",
    "#11A7FC", "#95D127", "#F2E415", "#FF8638", "EE3551",
    "#212640", "#5D718C", "#4B95A6", "#60BFBF", "EFF2D8",
    "#D8A64D", "#9B5422", "#351411", "#5B0D0D", "991C11",
    "#53324F", "#668D6E", "#F2E0A0", "#F19B7A", "F0756E",
    "#DFE0AF", "#A4BAA2", "#569492", "#41505E", "383245",
    "#7BBADE", "#93DE7F", "#FFED5D", "#F29E4A", "FF7050",
    "#133800", "#1B4F1B", "#398133", "#5C9548", "93E036",
    "#D9D7AD", "#91A685", "#FF6A00", "#37485C", "1C232E",
    "#008767", "#FFB27A", "#FF6145", "#AB2141", "5E1638",
    "#727B7F", "#CCEAEA", "#7A7556", "#2E2125", "44CACC",
    "#FFFFED", "#FF2C38", "#FF9A3A", "#FFF040", "67D9FF",
    "#007148", "#60A859", "#9BDA6A", "#C7F774", "F9FFEF",
    "#092740", "#45698B", "#90B0CC", "#F1FAFF", "8FD36F",
    "#E2FFA0", "#7D8076", "#FAFFED", "#C2CCBE", "8F7D70",
    "#00736A", "#00BC9F", "#F1EEC7", "#FEA301", "F2561A",
    "#26282E", "#AD5138", "#F7F7F7", "#DDDAE0", "8594AE",
    "#1A191F", "#35352F", "#484042", "#4E5252", "E64D38",
    "#49454A", "#E69B02", "#FAF4C6", "#B1D631", "324052",
    "#5F1A2B", "#1D2834", "#6F8B78", "#E4D49E", "C96466",
    "#012D3D", "#38AD9E", "#FFEB9E", "#FF6867", "D0DBED",
    "#0D1F36", "#104954", "#1E9C89", "#38CC85", "60EB7B",
    "#8C4E03", "#9FA66A", "#F2EC94", "#F23005", "8B0F03",
    "#000001", "#20201F", "#E2E2E4", "#590402", "B80000",
    "#344059", "#465973", "#F2D272", "#A69460", "595139",
    "#33454C", "#608F85", "#B6E5CB", "#8BAF95", "54584E",
    "#FBFEF6", "#B7BFA4", "#687F70", "#1A3841", "BF3847",
    "#D7E836", "#86FFC7", "#FFB048", "#E8366C", "593BFF",
    "#34A9FF", "#5982DB", "#665EB8", "#684682", "632E62",
    "#004056", "#2C858D", "#74CEB7", "#C9FFD5", "FFFFCB",
    "#BFB978", "#84945C", "#516967", "#4D3130", "281B24",
    "#103B73", "#20638C", "#3786A6", "#4EABBF", "EBEFF2",
    "#9FB1BF", "#1D2D63", "#1C5357", "#1F6E56", "196331",
    "#FFEBBA", "#C3BD91", "#88947B", "#4C3F3F", "2A2727",
    "#347373", "#4EA6A6", "#91D9D9", "#FFFFFD", "F2E205",
    "#828948", "#EFDFC2", "#006971", "#DC533E", "840000",
    "#000137", "#29003F", "#79003D", "#D04D14", "F89801",
    "#370005", "#4B0005", "#5F0005", "#730005", "870005",
    "#C3AE8D", "#F25260", "#2D5F73", "#6BADC9", "8FCED6",
    "#9E1B36", "#F7EDBA", "#E69B3D", "#EB3355", "3D241D",
    "#1D8281", "#44BF87", "#FBD258", "#F29A3F", "DB634F",
    "#035C75", "#1B808C", "#31A6A8", "#F3F1BC", "F3AD14",
    "#FF7500", "#665130", "#EBB643", "#CEDAA8", "668E84",
    "#384D3A", "#3E6653", "#728053", "#A68357", "D97C71",
    "#012326", "#17455C", "#E1CAAB", "#FE8333", "FA4913",
    "#1A2944", "#2DA7C7", "#56ACBA", "#98C4C9", "CBD5D2",
    "#BF3542", "#CDC5BA", "#EBE3D6", "#3C3C3C", "2E2E2E",
    "#231921", "#695F74", "#BEB4CB", "#EBEBF0", "D2DCEB",
    "#34373F", "#686C75", "#F3E9D0", "#BEB7A7", "8E867C",
    "#661510", "#D9351A", "#F2C76F", "#BF9727", "204D3F",
    "#3CFFEE", "#24AABC", "#356781", "#2C3D51", "1C1F24",
    "#DA3537", "#FFFCC4", "#00585F", "#6A6A61", "2A2C2B",
    "#AE3135", "#D1AF87", "#8C826B", "#3D3C33", "F2F0CE",
    "#FF0894", "#FF5E9F", "#FF91A7", "#FFB5CA", "F5F0BA",
    "#99878D", "#323232", "#646464", "#7E4A5C", "372129",
    "#3FB8AF", "#7FC7AF", "#DAD8A7", "#FFB38B", "FF3F34",
    "#402B3C", "#6AA6A6", "#D9CCA7", "#F2B263", "F26835",
    "#6AA690", "#F2BC1B", "#F2DC99", "#F29057", "BF1F1F",
    "#F4FAC7", "#7BAD8D", "#FFB158", "#F77F45", "C2454E",
    "#E5533C", "#F5E346", "#93D06D", "#50AC6A", "227864",
    "#39588A", "#A9BDD7", "#FFFFFF", "#FFEADD", "FFD0BB",
    "#B0B595", "#615F4F", "#828567", "#91A380", "EAFFCD",
    "#00427F", "#0066BD", "#66B5CC", "#F0E4C5", "D6C28F",
    "#FF6313", "#F9E4B3", "#C29689", "#74474B", "45232E",
    "#00585F", "#009393", "#FFFCC4", "#C7C49B", "EB0A00",
    "#091840", "#44A2FF", "#F7F7EA", "#B3CC63", "4C6620",
    "#5CBBE3", "#FCF1BC", "#5C8182", "#383A47", "B4F257",
    "#9E9E9E", "#E5E1D1", "#E0393D", "#253746", "425563",
    "#4D9453", "#FFFFB1", "#ADDE4E", "#FF9D27", "A62A16",
    "#B70046", "#FF850B", "#FFEBC5", "#109679", "675A4C",
    "#363636", "#0599B0", "#A4BD0A", "#FFA615", "FF2E00",
    "#7D8077", "#BBBFB2", "#FAFFED", "#E82A33", "E3DEBC",
    "#FD9F44", "#FC5C65", "#007269", "#03A679", "FAF0B9",
    "#134B57", "#81A489", "#F1D8B5", "#F2A054", "C04D31",
    "#946E49", "#394042", "#EDDBAC", "#872A0C", "BA8E3A",
    "#404040", "#024959", "#037E8C", "#FFFFFF", "F24C27",
    "#2A3342", "#163C6E", "#4E5F61", "#E6A015", "EDE7BE",
    "#445060", "#829AB5", "#849E91", "#C14543", "D6D5D1",
    "#8A9126", "#B7BF5E", "#FFE9C4", "#F5B776", "F58E45",
    "#9B2D1E", "#3C3A28", "#78A080", "#9BCD9E", "FFFFAE",
    "#FF6138", "#FFFF9D", "#BEEB9F", "#79BD8F", "00A388",
    "#990000", "#FF6600", "#FF9900", "#996633", "CC9966",
    "#DCE6DA", "#B8CCBB", "#98B3A5", "#7A9994", "62858C",
    "#0B1C29", "#3B7C8F", "#73A5A3", "#98C1B7", "F0EBD2",
    "#F6CB51", "#E25942", "#13A89E", "#3F4953", "F2E7DA",
    "#282F36", "#FFFEFC", "#BDA21D", "#BFBC5B", "D2E098",
    "#8C182D", "#DE7140", "#FCB95A", "#FAE285", "6A7349",
    "#6B9100", "#FFE433", "#FF841F", "#E03D19", "A6001C",
    "#FFEAA7", "#D9D697", "#9FC49F", "#718C6A", "543122",
    "#CFF09E", "#A8DBA8", "#79BD9A", "#3B8686", "0B486B",
    "#0C2233", "#065471", "#0A91AB", "#FFC045", "F2F2F2",
    "#BEE8E0", "#373C40", "#2E2621", "#73320B", "FF5E00",
    "#1B2C35", "#A3BFC6", "#FF005D", "#222A30", "293A42",
    "#FF8400", "#3B4044", "#494948", "#E6E1D8", "F7F2E9",
    "#6A482D", "#518C86", "#F6BF3D", "#EF7C27", "BF2424",
    "#261C2B", "#292B39", "#226468", "#608D80", "829D8F",
    "#B2AD9A", "#110E00", "#363226", "#A9A695", "ECE9D8",
    "#1B1B26", "#26394D", "#286480", "#13B3BF", "A3FF57",
    "#F2C2A7", "#F5E5C5", "#593D28", "#422C21", "93DEDB",
    "#001028", "#033140", "#1E5A5B", "#7BA78C", "EBEDC6",
    "#544E6E", "#808CB0", "#ABD1D9", "#D9FFF7", "DDF556",
    "#323A45", "#596677", "#758194", "#FFFFFF", "E74C3C",
    "#45291A", "#AB926D", "#DBD1BC", "#4999C3", "5FCBEC",
    "#6B151D", "#2E1615", "#A8553A", "#DB8F5A", "F2C18E",
    "#000623", "#28475C", "#4A6C74", "#8BA693", "F0E3B1",
    "#60807B", "#81B37A", "#BCCC5F", "#FFEE65", "E64964",
    "#FFFFFA", "#A1A194", "#5B605F", "#464646", "FF6600",
    "#1E1B17", "#577270", "#9C9A79", "#C7BDA1", "580E0C",
    "#452F27", "#5E504A", "#6B6865", "#9BBAB2", "B0FFED",
    "#1B5257", "#F7F6C3", "#F28159", "#CC5850", "4F1C2E",
    "#FAA51B", "#BF511F", "#2C445E", "#2F6D82", "5EE4EB",
    "#BF3952", "#59364A", "#556D73", "#D9D1A9", "D95F5F",
    "#024959", "#037E8C", "#F2EFDC", "#E74C30", "363636",
    "#221A26", "#544759", "#A197A6", "#F27405", "D93D04",
    "#C4A44A", "#E6D399", "#9AB8A9", "#7C8A7F", "4E4B44",
    "#FFFEC8", "#B1BF99", "#5B604D", "#39382B", "26181E",
    "#4E3C51", "#21A68D", "#3BBF9A", "#F2E8B6", "F25749",
    "#102144", "#1B325E", "#254580", "#3C63B0", "5D8AEA",
    "#2A3A48", "#3E6372", "#B2D4DC", "#FAFAFF", "FF4B00",
    "#FFF1BF", "#F20058", "#FFAEAC", "#000001", "7D7A96",
    "#FDFFC6", "#F2F096", "#FF0080", "#DE0049", "521218",
    "#5B0E00", "#FBB500", "#FBD864", "#807D1A", "59233C",
    "#1E1E1F", "#424143", "#67666A", "#807F83", "CBC9CF",
    "#3C3658", "#3EC8B7", "#7CD0B4", "#B9D8B1", "F7E0AE",
    "#FFFFFF", "#99B75F", "#D5DD98", "#EBF4DB", "D8D8D8",
    "#248A8A", "#C9FA58", "#F9E555", "#FAAC38", "F2572A",
    "#086B63", "#77A490", "#E2D8C1", "#BFAE95", "7C7159",
    "#5C4B51", "#8CBEB2", "#F2EBBF", "#A5C88F", "EF847B",
    "#17162F", "#89346D", "#C76058", "#FFB248", "E8C475",
    "#6E8F4A", "#65D9C5", "#F2E7B6", "#EDA430", "AB3E2C",
    "#30394F", "#FF434C", "#6ACEEB", "#EDE8DF", "0E6569",
    "#8E1B13", "#F9E4B3", "#849689", "#46464A", "29232E",
    "#686B30", "#AB9A52", "#E8BA67", "#D68F4F", "BA512E",
    "#E54E45", "#DBC390", "#F2F2EF", "#13A3A5", "403833",
    "#65BA99", "#59A386", "#F1DDBB", "#D6C4A6", "E74C3C",
    "#A6FFBC", "#4ACFAF", "#00A995", "#006161", "003D4C",
    "#33271E", "#8B7653", "#C8D9A0", "#FDEE9D", "233331",
    "#048789", "#503D2E", "#D44D27", "#E2A72E", "EFEBC8",
    "#E5FF1E", "#A9D943", "#75A660", "#698070", "494D4B",
    "#2DEBA2", "#91F57F", "#EBAA69", "#E70049", "2B0027",
    "#990000", "#336699", "#DDDDDD", "#999999", "333333",
    "#F13A4B", "#3D3C3E", "#22BDAF", "#F4F4F4", "D7D7D7",
    "#F53A59", "#001D2D", "#15A88C", "#B7D9C8", "F3F5F4",];


};

Ops.Color.ColorPalettes.prototype = new CABLES.Op();
CABLES.OPS["31d33a1e-9a0a-49f7-8bc8-9e83ab71e23e"]={f:Ops.Color.ColorPalettes,objName:"Ops.Color.ColorPalettes"};




// **************************************************************
// 
// Ops.Array.ArrayGetNumber
// 
// **************************************************************

Ops.Array.ArrayGetNumber = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    array = op.inArray("array"),
    index = op.inValueInt("index"),
    valueInvalid = op.inFloat("Value Invalid Index", 0),
    value = op.outNumber("value"),
    outValidIndex = op.outBoolNum("Valid Index", true);

array.ignoreValueSerialize = true;

index.onChange = array.onChange = update;

function update()
{
    if (array.get())
    {
        const input = array.get()[index.get()];
        if (isNaN(input))
        {
            value.set(valueInvalid.get());
            outValidIndex.set(false);
        }
        else
        {
            outValidIndex.set(true);
            value.set(parseFloat(input));
        }
    }
}


};

Ops.Array.ArrayGetNumber.prototype = new CABLES.Op();
CABLES.OPS["d1189078-70cf-437d-9a37-b2ebe89acdaf"]={f:Ops.Array.ArrayGetNumber,objName:"Ops.Array.ArrayGetNumber"};




// **************************************************************
// 
// Ops.Gl.ImageCompose.Vibrance
// 
// **************************************************************

Ops.Gl.ImageCompose.Vibrance = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"vibrance_frag":"IN vec2 texCoord;\nUNI sampler2D tex;\nUNI float amount;\n\nconst vec4 lumcoeff = vec4(0.299,0.587,0.114, 0.);\n\nvoid main()\n{\n   vec4 col=vec4(1.0,0.0,0.0,1.0);\n   col=texture(tex,texCoord);\n\n   float luma = dot(col, lumcoeff);\n   vec4 mask = (col - vec4(luma));\n   mask = clamp(mask, 0.0, 1.0);\n   float lumaMask = dot(lumcoeff, mask);\n   lumaMask = 1.0 - lumaMask;\n   vec4 vibrance = mix(vec4(luma), col, 1.0 + amount * lumaMask);\n   outColor= vibrance;\n}",};
const render = op.inTrigger("Render");
const trigger = op.outTrigger("Trigger");
const amount = op.inValue("amount", 2);

const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl, op.name, op);

shader.setSource(shader.getDefaultVertexShader(), attachments.vibrance_frag);
const textureUniform = new CGL.Uniform(shader, "t", "tex", 0);
const amountUniform = new CGL.Uniform(shader, "f", "amount", amount);

render.onTriggered = function ()
{
    if (!CGL.TextureEffect.checkOpInEffect(op)) return;

    cgl.pushShader(shader);
    cgl.currentTextureEffect.bind();

    cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);

    cgl.currentTextureEffect.finish();
    cgl.popShader();

    trigger.trigger();
};


};

Ops.Gl.ImageCompose.Vibrance.prototype = new CABLES.Op();
CABLES.OPS["9c71c980-e439-4397-9c2b-c2ae085eaed9"]={f:Ops.Gl.ImageCompose.Vibrance,objName:"Ops.Gl.ImageCompose.Vibrance"};




// **************************************************************
// 
// Ops.Number.Number
// 
// **************************************************************

Ops.Number.Number = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    v = op.inValueFloat("value"),
    result = op.outNumber("result");

v.onChange = exec;

function exec()
{
    result.set(Number(v.get()));
}


};

Ops.Number.Number.prototype = new CABLES.Op();
CABLES.OPS["8fb2bb5d-665a-4d0a-8079-12710ae453be"]={f:Ops.Number.Number,objName:"Ops.Number.Number"};




// **************************************************************
// 
// Ops.Gl.ShaderEffects.VertexDisplacementMap_v4
// 
// **************************************************************

Ops.Gl.ShaderEffects.VertexDisplacementMap_v4 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"vertdisplace_body_vert":"\nvec2 MOD_tc=texCoord;\n\n#ifdef MOD_COORD_MESHXY\n    MOD_tc=pos.xy;\n#endif\n#ifdef MOD_COORD_MESHXZ\n    MOD_tc=pos.xz;\n#endif\n\n\n#ifdef MOD_FLIP_Y\n    MOD_tc.y=1.0-MOD_tc.y;\n#endif\n#ifdef MOD_FLIP_X\n    MOD_tc.x=1.0-MOD_tc.x;\n#endif\n#ifdef MOD_FLIP_XY\n    MOD_tc=1.0-MOD_tc;\n#endif\n\nMOD_tc*=MOD_scale;\n\nvec4 MOD_sample=texture( MOD_texture, vec2(MOD_tc.x+MOD_offsetX,MOD_tc.y+MOD_offsetY) );\nvec3 MOD_disp;\n\n#ifdef MOD_INPUT_R\n    MOD_disp=vec3(MOD_sample.r);\n#endif\n#ifdef MOD_INPUT_G\n    MOD_disp=vec3(MOD_sample.g);\n#endif\n#ifdef MOD_INPUT_B\n    MOD_disp=vec3(MOD_sample.b);\n#endif\n#ifdef MOD_INPUT_A\n    MOD_disp=vec3(MOD_sample.a);\n#endif\n#ifdef MOD_INPUT_RGB\n    MOD_disp=MOD_sample.rgb;\n#endif\n#ifdef MOD_INPUT_LUMI\n    MOD_disp=vec3(dot(vec3(0.2126,0.7152,0.0722), MOD_sample.rgb));\n#endif\n\n\n\n#ifdef MOD_HEIGHTMAP_INVERT\n   MOD_disp=1.0-MOD_disp;\n#endif\n// #ifdef MOD_HEIGHTMAP_NORMALIZE\n//   MOD_disp-=0.5;\n//   MOD_disp*=2.0;\n// #endif\n\n\n#ifdef MOD_HEIGHTMAP_NORMALIZE\n    MOD_disp=(MOD_disp-0.5)*2.0;\n    // MOD_disp=(MOD_disp-0.5)*-1.0+0.5;\n#endif\n\n\nfloat MOD_zero=0.0;\n\n#ifdef MOD_MODE_DIV\n    MOD_zero=1.0;\n#endif\n#ifdef MOD_MODE_MUL\n    MOD_zero=1.0;\n#endif\n\n\n\nvec3 MOD_mask=vec3(1.0);\n\n#ifdef MOD_AXIS_X\n    MOD_mask=vec3(1.,0.,0.);\n    MOD_disp*=MOD_mask*MOD_extrude;\n#endif\n#ifdef MOD_AXIS_Y\n    MOD_mask=vec3(0.,1.,0.);\n    MOD_disp*=MOD_mask*MOD_extrude;\n#endif\n#ifdef MOD_AXIS_Z\n    MOD_mask=vec3(0.,0.,1.);\n    MOD_disp*=MOD_mask*MOD_extrude;\n#endif\n#ifdef MOD_AXIS_XY\n    MOD_mask=vec3(1.,1.,0.);\n    MOD_disp*=MOD_mask*MOD_extrude;\n#endif\n#ifdef MOD_AXIS_XYZ\n    MOD_mask=vec3(1.,1.,1.);\n    MOD_disp*=MOD_mask*MOD_extrude;\n#endif\n\n\n// MOD_disp=smoothstep(-1.,1.,MOD_disp*MOD_disp*MOD_disp);\n// MOD_disp=MOD_disp*MOD_disp*MOD_disp;\n\n// #ifdef MOD_FLIP_Y\n//     MOD_mask.y=1.0-MOD_mask.y;\n// #endif\n// #ifdef MOD_FLIP_X\n//     MOD_mask.x=1.0-MOD_mask.x;\n// #endif\n// #ifdef MOD_FLIP_XY\n//     MOD_mask.xy=1.0-MOD_mask.xy;\n// #endif\n\n\n\n#ifdef MOD_MODE_DIV\n    pos.xyz/=MOD_disp*MOD_mask;\n#endif\n\n#ifdef MOD_MODE_MUL\n    pos.xyz*=MOD_disp*MOD_mask;\n#endif\n\n#ifdef MOD_MODE_ADD\n    pos.xyz+=MOD_disp*MOD_mask;\n#endif\n\n#ifdef MOD_MODE_NORMAL\n\n    vec3 MOD_t=norm;\n    #ifdef MOD_SMOOTHSTEP\n        MOD_t=smoothstep(-1.,1.,MOD_t);\n    #endif\n\n    pos.xyz+=MOD_t*MOD_disp*MOD_mask;\n\n#endif\n\n#ifdef MOD_MODE_TANGENT\n    MOD_disp*=-1.0;\n\n    vec3 MOD_t=attrTangent;\n    #ifdef MOD_SMOOTHSTEP\n        MOD_t=smoothstep(-1.,1.,MOD_t);\n    #endif\n\n    pos.xyz+=MOD_t*MOD_disp*MOD_mask;\n\n#endif\n\n#ifdef MOD_MODE_BITANGENT\n    MOD_disp*=-1.0;\n    vec3 MOD_t=attrBiTangent;\n\n    #ifdef MOD_SMOOTHSTEP\n        MOD_t=smoothstep(-1.,1.,MOD_t);\n    #endif\n\n    pos.xyz+=MOD_t*MOD_disp*MOD_mask;\n\n#endif\n\n#ifdef MOD_MODE_VERTCOL\n    vec3 MOD_t=attrVertColor.rgb*vec3(2.0)-vec3(1.0);\n\n    #ifdef MOD_SMOOTHSTEP\n        MOD_t=smoothstep(-1.,1.,MOD_t);\n    #endif\n\n    pos.xyz+=MOD_t*MOD_disp*MOD_mask;\n\n#endif\n\n\n// pos.y*=-1.0;\n    // pos.xy+=vec2(MOD_texVal*MOD_extrude)*normalize(pos.xy);\n\n\nMOD_displHeightMapColor=MOD_disp;\n\n\n#ifdef MOD_CALC_NORMALS\n    norm+=MOD_calcNormal(MOD_texture,MOD_tc);\n#endif","vertdisplace_head_vert":"OUT vec3 MOD_displHeightMapColor;\n\n#ifdef MOD_MODE_VERTCOL\n#ifndef VERTEX_COLORS\nIN vec4 attrVertColor;\n#endif\n#endif\n\n// mat4 rotationX( in float angle ) {\n// \treturn mat4(\t1.0,\t\t0,\t\t\t0,\t\t\t0,\n// \t\t\t \t\t0, \tcos(angle),\t-sin(angle),\t\t0,\n// \t\t\t\t\t0, \tsin(angle),\t cos(angle),\t\t0,\n// \t\t\t\t\t0, \t\t\t0,\t\t\t  0, \t\t1);\n// }\n\n// mat4 rotationY( in float angle ) {\n// \treturn mat4(\tcos(angle),\t\t0,\t\tsin(angle),\t0,\n// \t\t\t \t\t\t\t0,\t\t1.0,\t\t\t 0,\t0,\n// \t\t\t\t\t-sin(angle),\t0,\t\tcos(angle),\t0,\n// \t\t\t\t\t\t\t0, \t\t0,\t\t\t\t0,\t1);\n// }\n\n// mat4 rotationZ( in float angle ) {\n// \treturn mat4(\tcos(angle),\t\t-sin(angle),\t0,\t0,\n// \t\t\t \t\tsin(angle),\t\tcos(angle),\t\t0,\t0,\n// \t\t\t\t\t\t\t0,\t\t\t\t0,\t\t1,\t0,\n// \t\t\t\t\t\t\t0,\t\t\t\t0,\t\t0,\t1);\n// }\n\n\nvec3 MOD_calcNormal(sampler2D tex,vec2 uv)\n{\n    float strength=13.0;\n    // float texelSize=1.0/float(textureSize(tex,0).x); // not on linux intel?!\n    float texelSize=1.0/512.0;\n\n    float tl = abs(texture(tex, uv + texelSize * vec2(-1.0, -1.0)).x);   // top left\n    float  l = abs(texture(tex, uv + texelSize * vec2(-1.0,  0.0)).x);   // left\n    float bl = abs(texture(tex, uv + texelSize * vec2(-1.0,  1.0)).x);   // bottom left\n    float  t = abs(texture(tex, uv + texelSize * vec2( 0.0, -1.0)).x);   // top\n    float  b = abs(texture(tex, uv + texelSize * vec2( 0.0,  1.0)).x);   // bottom\n    float tr = abs(texture(tex, uv + texelSize * vec2( 1.0, -1.0)).x);   // top right\n    float  r = abs(texture(tex, uv + texelSize * vec2( 1.0,  0.0)).x);   // right\n    float br = abs(texture(tex, uv + texelSize * vec2( 1.0,  1.0)).x);   // bottom right\n\n    //     // Compute dx using Sobel:\n    //     //           -1 0 1\n    //     //           -2 0 2\n    //     //           -1 0 1\n    float dX = tr + 2.0*r + br -tl - 2.0*l - bl;\n\n    //     // Compute dy using Sobel:\n    //     //           -1 -2 -1\n    //     //            0  0  0\n    //     //            1  2  1\n    float dY = bl + 2.0*b + br -tl - 2.0*t - tr;\n\n    //     // Build the normalized normal\n\nvec3 N;\n\n#ifdef MOD_NORMALS_Z\n    N = normalize(vec3(dX,dY, 1.0 / strength));\n#endif\n\n#ifdef MOD_NORMALS_Y\n    N = normalize(vec3(dX,1.0/strength,dY));\n#endif\n#ifdef MOD_NORMALS_X\n    N = normalize(vec3(1.0/strength,dX,dY));\n#endif\n// N*=-1.0;\n// N= N * 0.5 + 0.5;\n\n\n   return N;\n}\n",};
const
    render = op.inTrigger("Render"),
    extrude = op.inValue("Extrude", 0.5),
    meth = op.inSwitch("Mode", ["Norm", "Tang", "BiTang", "VertCol", "*", "+", "/"], "Norm"),
    axis = op.inSwitch("Axis", ["XYZ", "XY", "X", "Y", "Z"], "XYZ"),
    src = op.inSwitch("Coordinates", ["Tex Coords", "Mesh XY", "Mesh XZ"], "Tex Coords"),

    texture = op.inTexture("Texture", null, "texture"),
    channel = op.inSwitch("Channel", ["Luminance", "R", "G", "B", "A", "RGB"], "Luminance"),
    flip = op.inSwitch("Flip", ["None", "X", "Y", "XY"], "None"),
    range = op.inSwitch("Range", ["0-1", "1-0", "Normalized"], "0-1"),
    offsetX = op.inValueFloat("Offset X"),
    offsetY = op.inValueFloat("Offset Y"),
    scale = op.inValueFloat("Scale", 1),

    calcNormals = op.inValueBool("Calc Normals", false),
    calcNormalsAxis = op.inSwitch("Normal Axis", ["X", "Y", "Z"], "Z"),
    removeZero = op.inValueBool("Discard Zero Values"),
    colorize = op.inValueBool("colorize", false),
    colorizeMin = op.inValueSlider("Colorize Min", 0),
    colorizeMax = op.inValueSlider("Colorize Max", 1),
    next = op.outTrigger("trigger");

const cgl = op.patch.cgl;

op.setPortGroup("Input", [texture, flip, channel, range, offsetX, offsetY, scale]);
op.setPortGroup("Colorize", [colorize, colorizeMin, colorizeMax, removeZero]);

op.toWorkPortsNeedToBeLinked(texture, next, render);

render.onTriggered = dorender;

channel.onChange =
    src.onChange =
    axis.onChange =
    flip.onChange =
    meth.onChange =
    range.onChange =
    colorize.onChange =
    removeZero.onChange =
    calcNormals.onChange =
    calcNormalsAxis.onChange = updateDefines;

const srcHeadVert = attachments.vertdisplace_head_vert;
const srcBodyVert = attachments.vertdisplace_body_vert;

const srcHeadFrag = ""
    .endl() + "IN vec3 MOD_displHeightMapColor;"
    .endl() + "vec3 MOD_map(vec3 value, float inMin, float inMax, float outMin, float outMax) { return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);}"

    .endl();

const srcBodyFrag = ""
    .endl() + "#ifdef MOD_HEIGHTMAP_COLORIZE"
    .endl() + "   col.rgb*=MOD_map( MOD_displHeightMapColor, 0.0,1.0 , MOD_colorizeMin,MOD_colorizeMax);"
    .endl() + "#endif"
    .endl() + "#ifdef MOD_DISPLACE_REMOVE_ZERO"
    .endl() + "   if(MOD_displHeightMapColor.r==0.0)discard;"
    .endl() + "#endif"
    .endl();

const mod = new CGL.ShaderModifier(cgl, op.name, { "opId": op.id });
mod.addModule({
    "title": op.name,
    "name": "MODULE_VERTEX_POSITION",
    "srcHeadVert": srcHeadVert,
    "srcBodyVert": srcBodyVert
});

mod.addModule({
    "title": op.name,
    "name": "MODULE_COLOR",
    "srcHeadFrag": srcHeadFrag,
    "srcBodyFrag": srcBodyFrag
});

mod.addUniformVert("t", "MOD_texture", 0);
mod.addUniformVert("f", "MOD_extrude", extrude);
mod.addUniformVert("f", "MOD_offsetX", offsetX);
mod.addUniformVert("f", "MOD_offsetY", offsetY);
mod.addUniformVert("f", "MOD_scale", scale);

mod.addUniformFrag("f", "MOD_colorizeMin", colorizeMin);
mod.addUniformFrag("f", "MOD_colorizeMax", colorizeMax);

updateDefines();

function updateDefines()
{
    mod.toggleDefine("MOD_HEIGHTMAP_COLORIZE", colorize.get());

    mod.toggleDefine("MOD_HEIGHTMAP_INVERT", range.get() == "1-0");
    mod.toggleDefine("MOD_HEIGHTMAP_NORMALIZE", range.get() == "Normalized");

    mod.toggleDefine("MOD_DISPLACE_REMOVE_ZERO", removeZero.get());

    mod.toggleDefine("MOD_INPUT_R", channel.get() == "R");
    mod.toggleDefine("MOD_INPUT_G", channel.get() == "G");
    mod.toggleDefine("MOD_INPUT_B", channel.get() == "B");
    mod.toggleDefine("MOD_INPUT_A", channel.get() == "A");
    mod.toggleDefine("MOD_INPUT_RGB", channel.get() == "RGB");
    mod.toggleDefine("MOD_INPUT_LUMI", channel.get() == "Luminance");

    mod.toggleDefine("MOD_FLIP_X", flip.get() == "X");
    mod.toggleDefine("MOD_FLIP_Y", flip.get() == "Y");
    mod.toggleDefine("MOD_FLIP_XY", flip.get() == "XY");

    mod.toggleDefine("MOD_AXIS_X", axis.get() == "X");
    mod.toggleDefine("MOD_AXIS_Y", axis.get() == "Y");
    mod.toggleDefine("MOD_AXIS_Z", axis.get() == "Z");
    mod.toggleDefine("MOD_AXIS_XYZ", axis.get() == "XYZ");
    mod.toggleDefine("MOD_AXIS_XY", axis.get() == "XY");

    mod.toggleDefine("MOD_MODE_BITANGENT", meth.get() == "BiTang");
    mod.toggleDefine("MOD_MODE_TANGENT", meth.get() == "Tang");
    mod.toggleDefine("MOD_MODE_NORMAL", meth.get() == "Norm");
    mod.toggleDefine("MOD_MODE_VERTCOL", meth.get() == "VertCol");
    mod.toggleDefine("MOD_MODE_MUL", meth.get() == "*");
    mod.toggleDefine("MOD_MODE_ADD", meth.get() == "+");
    mod.toggleDefine("MOD_MODE_DIV", meth.get() == "/");
    mod.toggleDefine("MOD_SMOOTHSTEP", 0);

    mod.toggleDefine("MOD_COORD_TC", src.get() == "Tex Coords");
    mod.toggleDefine("MOD_COORD_MESHXY", src.get() == "Mesh XY");
    mod.toggleDefine("MOD_COORD_MESHXZ", src.get() == "Mesh XZ");

    mod.toggleDefine("MOD_CALC_NORMALS", calcNormals.get());
    mod.toggleDefine("MOD_NORMALS_X", calcNormalsAxis.get() == "X");
    mod.toggleDefine("MOD_NORMALS_Y", calcNormalsAxis.get() == "Y");
    mod.toggleDefine("MOD_NORMALS_Z", calcNormalsAxis.get() == "Z");

    calcNormalsAxis.setUiAttribs({ "greyout": !calcNormals.get() });
}

function dorender()
{
    mod.bind();

    if (texture.get() && !texture.get().deleted) mod.pushTexture("MOD_texture", texture.get());
    else mod.pushTexture("MOD_texture", CGL.Texture.getEmptyTexture(cgl));

    next.trigger();

    mod.unbind();
}


};

Ops.Gl.ShaderEffects.VertexDisplacementMap_v4.prototype = new CABLES.Op();
CABLES.OPS["ed36e5ad-457b-4ac6-a929-11b66951cb6c"]={f:Ops.Gl.ShaderEffects.VertexDisplacementMap_v4,objName:"Ops.Gl.ShaderEffects.VertexDisplacementMap_v4"};




// **************************************************************
// 
// Ops.Gl.ImageCompose.Vignette_v3
// 
// **************************************************************

Ops.Gl.ImageCompose.Vignette_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"vignette_frag":"IN vec2 texCoord;\nUNI sampler2D tex;\nUNI float lensRadius1;\nUNI float aspect;\nUNI float amount;\nUNI float strength;\nUNI float sharp;\n\nUNI vec3 vcol;\n\n{{CGL.BLENDMODES3}}\n\nvoid main()\n{\n    vec4 base=texture(tex,texCoord);\n    vec4 vvcol=vec4(vcol,1.0);\n    vec4 col=texture(tex,texCoord);\n    vec2 tcPos=vec2(texCoord.x,(texCoord.y-0.5)*aspect+0.5);\n    float dist = distance(tcPos, vec2(0.5,0.5));\n    float am = (1.0-smoothstep( (lensRadius1+0.5), (lensRadius1*0.99+0.5)*sharp, dist));\n\n    col=mix(col,vvcol,am*strength);\n\n    #ifndef ALPHA\n        outColor=cgl_blendPixel(base,col,amount);\n    #endif\n\n    #ifdef ALPHA\n        outColor=vec4(base.rgb,base.a*(1.0-am*strength));\n    #endif\n}\n",};
const
    render = op.inTrigger("Render"),
    blendMode = CGL.TextureEffect.AddBlendSelect(op, "Blend Mode", "normal"),
    maskAlpha = CGL.TextureEffect.AddBlendAlphaMask(op),
    amount = op.inValueSlider("Amount", 1),
    trigger = op.outTrigger("Trigger"),
    strength = op.inValueSlider("Strength", 1),
    lensRadius1 = op.inValueSlider("Radius", 0.3),
    sharp = op.inValueSlider("Sharp", 0.25),
    aspect = op.inValue("Aspect", 1),
    r = op.inValueSlider("r", 0),
    g = op.inValueSlider("g", 0),
    b = op.inValueSlider("b", 0),
    alpha = op.inBool("Alpha", false);

r.setUiAttribs({ "colorPick": true });

const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl, "vignette");

shader.setSource(shader.getDefaultVertexShader(), attachments.vignette_frag);

const
    textureUniform = new CGL.Uniform(shader, "t", "tex", 0),
    amountUniform = new CGL.Uniform(shader, "f", "amount", amount),
    uniLensRadius1 = new CGL.Uniform(shader, "f", "lensRadius1", lensRadius1),
    uniaspect = new CGL.Uniform(shader, "f", "aspect", aspect),
    unistrength = new CGL.Uniform(shader, "f", "strength", strength),
    unisharp = new CGL.Uniform(shader, "f", "sharp", sharp),
    unir = new CGL.Uniform(shader, "3f", "vcol", r, g, b);

CGL.TextureEffect.setupBlending(op, shader, blendMode, amount, maskAlpha);

alpha.onChange = updateDefines;
updateDefines();

function updateDefines()
{
    shader.toggleDefine("ALPHA", alpha.get());

    r.setUiAttribs({ "greyout": alpha.get() });
    g.setUiAttribs({ "greyout": alpha.get() });
    b.setUiAttribs({ "greyout": alpha.get() });
}

render.onTriggered = function ()
{
    if (!CGL.TextureEffect.checkOpInEffect(op, 3)) return;

    cgl.pushShader(shader);
    cgl.currentTextureEffect.bind();

    cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);

    cgl.currentTextureEffect.finish();
    cgl.popShader();

    trigger.trigger();
};


};

Ops.Gl.ImageCompose.Vignette_v3.prototype = new CABLES.Op();
CABLES.OPS["588302cb-f5a7-4129-90d2-ba66212d69e5"]={f:Ops.Gl.ImageCompose.Vignette_v3,objName:"Ops.Gl.ImageCompose.Vignette_v3"};




// **************************************************************
// 
// Ops.Sidebar.SidebarText_v2
// 
// **************************************************************

Ops.Sidebar.SidebarText_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
// inputs
const parentPort = op.inObject("link");
const labelPort = op.inString("Text", "Value");
const inId = op.inValueString("Id", "");

// outputs
const siblingsPort = op.outObject("childs");

// vars
const el = document.createElement("div");
el.dataset.op = op.id;
el.classList.add("cablesEle");
el.classList.add("sidebar__item");
el.classList.add("sidebar__text");
const label = document.createElement("div");
label.classList.add("sidebar__item-label");
const labelText = document.createElement("div");// document.createTextNode(labelPort.get());
label.appendChild(labelText);
el.appendChild(label);

// events
parentPort.onChange = onParentChanged;
labelPort.onChange = onLabelTextChanged;
inId.onChange = onIdChanged;
op.onDelete = onDelete;

op.toWorkNeedsParent("Ops.Sidebar.Sidebar");

// functions

function onIdChanged()
{
    el.id = inId.get();
}

function onLabelTextChanged()
{
    const labelText = labelPort.get();
    label.innerHTML = labelText;
}

function onParentChanged()
{
    siblingsPort.set(null);
    const parent = parentPort.get();
    if (parent && parent.parentElement)
    {
        parent.parentElement.appendChild(el);
        siblingsPort.set(parent);
    }
    else
    { // detach
        if (el.parentElement)
        {
            el.parentElement.removeChild(el);
        }
    }
}

function showElement(el)
{
    if (el)
    {
        el.style.display = "block";
    }
}

function hideElement(el)
{
    if (el)
    {
        el.style.display = "none";
    }
}

function onDelete()
{
    removeElementFromDOM(el);
}

function removeElementFromDOM(el)
{
    if (el && el.parentNode && el.parentNode.removeChild)
    {
        el.parentNode.removeChild(el);
    }
}


};

Ops.Sidebar.SidebarText_v2.prototype = new CABLES.Op();
CABLES.OPS["cc591cc3-ff23-4817-907c-e5be7d5c059d"]={f:Ops.Sidebar.SidebarText_v2,objName:"Ops.Sidebar.SidebarText_v2"};




// **************************************************************
// 
// Ops.Devices.Keyboard.KeyPressLearn
// 
// **************************************************************

Ops.Devices.Keyboard.KeyPressLearn = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const learnedKeyCode = op.inValueInt("key code");
const canvasOnly = op.inValueBool("canvas only", true);
const modKey = op.inValueSelect("Mod Key", ["none", "alt"], "none");
const inEnable = op.inValueBool("Enabled", true);
const preventDefault = op.inValueBool("Prevent Default");
const learn = op.inTriggerButton("learn");
const onPress = op.outTrigger("on press");
const onRelease = op.outTrigger("on release");
const outPressed = op.outBoolNum("Pressed", false);
const outKey = op.outString("Key");

const cgl = op.patch.cgl;
let learning = false;

modKey.onChange = learnedKeyCode.onChange = updateKeyName;

function onKeyDown(e)
{
    if (learning)
    {
        learnedKeyCode.set(e.keyCode);
        if (CABLES.UI)
        {
            op.refreshParams();
        }
        // op.log("Learned key code: " + learnedKeyCode.get());
        learning = false;
        removeListeners();
        addListener();

        if (CABLES.UI)gui.emitEvent("portValueEdited", op, learnedKeyCode, learnedKeyCode.get());
    }
    else
    {
        if (e.keyCode == learnedKeyCode.get())
        {
            if (modKey.get() == "alt")
            {
                if (e.altKey === true)
                {
                    onPress.trigger();
                    outPressed.set(true);
                    if (preventDefault.get())e.preventDefault();
                }
            }
            else
            {
                onPress.trigger();
                outPressed.set(true);
                if (preventDefault.get())e.preventDefault();
            }
        }
    }
}

function onKeyUp(e)
{
    if (e.keyCode == learnedKeyCode.get())
    {
        let doTrigger = true;
        if (modKey.get() == "alt" && e.altKey != true) doTrigger = false;

        if (doTrigger)
        {
            onRelease.trigger();
            outPressed.set(false);
        }
    }
}

op.onDelete = function ()
{
    cgl.canvas.removeEventListener("keyup", onKeyUp, false);
    cgl.canvas.removeEventListener("keydown", onKeyDown, false);
    document.removeEventListener("keyup", onKeyUp, false);
    document.removeEventListener("keydown", onKeyDown, false);
};

learn.onTriggered = function ()
{
    // op.log("Listening for key...");
    learning = true;
    addDocumentListener();

    setTimeout(function ()
    {
        learning = false;
        removeListeners();
        addListener();
    }, 3000);
};

function addListener()
{
    if (canvasOnly.get()) addCanvasListener();
    else addDocumentListener();
}

function removeListeners()
{
    document.removeEventListener("keydown", onKeyDown, false);
    document.removeEventListener("keyup", onKeyUp, false);
    cgl.canvas.removeEventListener("keydown", onKeyDown, false);
    cgl.canvas.removeEventListener("keyup", onKeyUp, false);
    outPressed.set(false);
}

function addCanvasListener()
{
    if (!CABLES.UTILS.isNumeric(cgl.canvas.getAttribute("tabindex"))) cgl.canvas.setAttribute("tabindex", 1);

    cgl.canvas.addEventListener("keydown", onKeyDown, false);
    cgl.canvas.addEventListener("keyup", onKeyUp, false);
}

function addDocumentListener()
{
    document.addEventListener("keydown", onKeyDown, false);
    document.addEventListener("keyup", onKeyUp, false);
}

inEnable.onChange = function ()
{
    if (!inEnable.get())
    {
        removeListeners();
    }
    else
    {
        addListener();
    }
};

canvasOnly.onChange = function ()
{
    removeListeners();
    addListener();
};

function updateKeyName()
{
    let keyName = CABLES.keyCodeToName(learnedKeyCode.get());
    const modKeyName = modKey.get();
    if (modKeyName && modKeyName !== "none")
    {
        keyName = modKeyName.charAt(0).toUpperCase() + modKeyName.slice(1) + "-" + keyName;
    }
    op.setUiAttribs({ "extendTitle": keyName });
    outKey.set(keyName);
}

addCanvasListener();


};

Ops.Devices.Keyboard.KeyPressLearn.prototype = new CABLES.Op();
CABLES.OPS["f069c0db-4051-4eae-989e-6ef7953787fd"]={f:Ops.Devices.Keyboard.KeyPressLearn,objName:"Ops.Devices.Keyboard.KeyPressLearn"};




// **************************************************************
// 
// Ops.Boolean.ToggleBool_v2
// 
// **************************************************************

Ops.Boolean.ToggleBool_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    trigger = op.inTriggerButton("trigger"),
    reset = op.inTriggerButton("reset"),
    inDefault = op.inBool("Default", false),
    next = op.outTrigger("Next"),
    outBool = op.outBoolNum("result");

let theBool = false;

op.onLoadedValueSet = () =>
{
    outBool.set(inDefault.get());
    next.trigger();
};

trigger.onTriggered = function ()
{
    theBool = !theBool;
    outBool.set(theBool);
    next.trigger();
};

reset.onTriggered = function ()
{
    theBool = inDefault.get();
    outBool.set(theBool);
    next.trigger();
};


};

Ops.Boolean.ToggleBool_v2.prototype = new CABLES.Op();
CABLES.OPS["4313d9bb-96b6-43bc-9190-6068cfb2593c"]={f:Ops.Boolean.ToggleBool_v2,objName:"Ops.Boolean.ToggleBool_v2"};




// **************************************************************
// 
// Ops.String.RandomString_v3
// 
// **************************************************************

Ops.String.RandomString_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    chars = op.inString("chars", "cables"),
    len = op.inInt("Length", 10),
    inSeed = op.inFloat("Seed", 0),
    result = op.outString("Result");

len.onChange =
    chars.onChange =
    inSeed.onChange = gen;
gen();

function gen()
{
    Math.setRandomSeed(Math.abs(inSeed.get()));

    const charArray = Array.from(chars.get());
    let str = "";
    if (charArray.length > 0)
    {
        let numChars = charArray.length - 1;
        for (let i = 0; i < Math.abs(len.get()); i++)
            str += charArray[Math.round(Math.seededRandom() * numChars)];
    }

    result.set(str);
}


};

Ops.String.RandomString_v3.prototype = new CABLES.Op();
CABLES.OPS["d2374316-90b1-4f50-bdb6-0d7296bbea75"]={f:Ops.String.RandomString_v3,objName:"Ops.String.RandomString_v3"};




// **************************************************************
// 
// Ops.Array.RandomNumbersArray_v4
// 
// **************************************************************

Ops.Array.RandomNumbersArray_v4 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    numValues = op.inValueInt("Num Values", 100),
    inModeSwitch = op.inSwitch("Mode", ["A", "AB", "ABC", "ABCD"], "A"),
    inSeed = op.inValueFloat("Random Seed ", 0),
    inInteger = op.inBool("Integer", false),
    inClosed = op.inValueBool("Last == First"),
    outValues = op.outArray("Array Out"),
    outTotalPoints = op.outNumber("Chunks Amount"),
    outArrayLength = op.outNumber("Array length");

const letters = ["A", "B", "C", "D"];
const arr = [];

const inArray = letters.map(function (value)
{
    return {
        "min": op.inValueFloat("Min " + value, -1),
        "max": op.inValueFloat("Max " + value, 1),
    };
});

for (let i = 0; i < inArray.length; i += 1)
{
    const portObj = inArray[i];
    const keys = Object.keys(portObj);

    op.setPortGroup("Value Range " + letters[i], keys.map(function (key) { return portObj[key]; }));

    if (i > 0) keys.forEach(function (key) { portObj[key].setUiAttribs({ "greyout": true }); });
}

inModeSwitch.onChange = function ()
{
    const mode = inModeSwitch.get();
    const modes = inModeSwitch.uiAttribs.values;

    outValues.setUiAttribs({ "stride": inModeSwitch.get().length });

    const index = modes.indexOf(mode);

    inArray.forEach(function (portObj, i)
    {
        const keys = Object.keys(portObj);
        keys.forEach(function (key, j)
        {
            if (i <= index) portObj[key].setUiAttribs({ "greyout": false });
            else portObj[key].setUiAttribs({ "greyout": true });
        });
    });
    init();
};

outValues.ignoreValueSerialize = true;

inClosed.onChange =
    numValues.onChange =
    inSeed.onChange =
    inInteger.onChange = init;

const minMaxArray = [];

init();

function init()
{
    const mode = inModeSwitch.get();
    const modes = inModeSwitch.uiAttribs.values;
    const index = modes.indexOf(mode);

    const n = Math.floor(Math.abs(numValues.get()));
    Math.randomSeed = inSeed.get();

    op.setUiAttrib({ "extendTitle": n + "*" + mode.length });

    const dimension = index + 1;
    const length = n * dimension;

    arr.length = length;
    const tupleLength = length / dimension;
    const isInteger = inInteger.get();

    // optimization: we only need to fetch the max min for each component once
    for (let i = 0; i < dimension; i += 1)
    {
        const portObj = inArray[i];
        const max = portObj.max.get();
        const min = portObj.min.get();
        minMaxArray[i] = [min, max];
    }

    for (let j = 0; j < tupleLength; j += 1)
    {
        for (let k = 0; k < dimension; k += 1)
        {
            const min = minMaxArray[k][0];
            const max = minMaxArray[k][1];
            const index = j * dimension + k;

            if (isInteger) arr[index] = Math.floor(Math.seededRandom() * ((max + 1) - min) + min);
            else arr[index] = Math.seededRandom() * (max - min) + min;
        }
    }

    if (inClosed.get() && arr.length > dimension)
    {
        for (let i = 0; i < dimension; i++)
            arr[arr.length - 3 + i] = arr[i];
    }

    outValues.setRef(arr);
    outTotalPoints.set(arr.length / dimension);
    outArrayLength.set(arr.length);
}

// assign change handler
inArray.forEach(function (obj)
{
    Object.keys(obj).forEach(function (key)
    {
        const x = obj[key];
        x.onChange = init;
    });
});


};

Ops.Array.RandomNumbersArray_v4.prototype = new CABLES.Op();
CABLES.OPS["8a9fa2c6-c229-49a9-9dc8-247001539217"]={f:Ops.Array.RandomNumbersArray_v4,objName:"Ops.Array.RandomNumbersArray_v4"};




// **************************************************************
// 
// Ops.Math.TriggerRandomNumber_v2
// 
// **************************************************************

Ops.Math.TriggerRandomNumber_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    exe = op.inTriggerButton("Generate"),
    min = op.inValue("min", 0),
    max = op.inValue("max", 1),
    outTrig = op.outTrigger("next"),
    result = op.outNumber("result"),
    inInteger = op.inValueBool("Integer", false),
    noDupe = op.inValueBool("No consecutive duplicates", false);

op.setPortGroup("Value Range", [min, max]);

exe.onTriggered =
    max.onChange =
    min.onChange =
    inInteger.onChange = genRandom;

genRandom();

function genRandom()
{
    let r = (Math.random() * (max.get() - min.get())) + min.get();

    if (inInteger.get())r = randInt();

    if (min.get() != max.get() && max.get() > min.get())
        while (noDupe.get() && r == result.get()) r = randInt();

    result.set(r);
    outTrig.trigger();
}

function randInt()
{
    return Math.floor((Math.random() * ((max.get() - min.get() + 1))) + min.get());
}


};

Ops.Math.TriggerRandomNumber_v2.prototype = new CABLES.Op();
CABLES.OPS["26f446cc-9107-4164-8209-5254487fa132"]={f:Ops.Math.TriggerRandomNumber_v2,objName:"Ops.Math.TriggerRandomNumber_v2"};




// **************************************************************
// 
// Ops.Number.Integer
// 
// **************************************************************

Ops.Number.Integer = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    input = op.inInt("Integer", 0),
    output = op.outNumber("Number out");

input.onChange = function ()
{
    output.set(Math.floor(input.get()));
};


};

Ops.Number.Integer.prototype = new CABLES.Op();
CABLES.OPS["17bc01d7-04ad-4aab-b88b-bb09744c4a69"]={f:Ops.Number.Integer,objName:"Ops.Number.Integer"};




// **************************************************************
// 
// Ops.Math.FlipSign
// 
// **************************************************************

Ops.Math.FlipSign = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    inval = op.inValueFloat("Value", 1),
    result = op.outNumber("Result");

inval.onChange = update;
update();

function update()
{
    result.set(inval.get() * -1);
}


};

Ops.Math.FlipSign.prototype = new CABLES.Op();
CABLES.OPS["f5c858a2-2654-4108-86fe-319efa70ecec"]={f:Ops.Math.FlipSign,objName:"Ops.Math.FlipSign"};



window.addEventListener('load', function(event) {
CABLES.jsLoaded=new Event('CABLES.jsLoaded');
document.dispatchEvent(CABLES.jsLoaded);
});
