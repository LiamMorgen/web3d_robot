# 创建目录
$dirs = @("js/libs", "js/controls", "js/postprocessing")
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
}

# 定义文件下载列表
$files = @(
    @{url="https://threejs.org/build/three.min.js"; path="js/libs/three.min.js"},
    @{url="https://threejs.org/examples/jsm/controls/OrbitControls.js"; path="js/controls/OrbitControls.js"},
    @{url="https://threejs.org/examples/jsm/postprocessing/EffectComposer.js"; path="js/postprocessing/EffectComposer.js"},
    @{url="https://threejs.org/examples/jsm/postprocessing/RenderPass.js"; path="js/postprocessing/RenderPass.js"},
    @{url="https://threejs.org/examples/jsm/postprocessing/UnrealBloomPass.js"; path="js/postprocessing/UnrealBloomPass.js"}
)

foreach ($file in $files) {
    Write-Host "Downloading $($file.path) from $($file.url) ..."
    try {
        Invoke-WebRequest -Uri $file.url -OutFile $file.path -UseBasicParsing
        Write-Host "Saved to $($file.path)"
    }
    catch {
        Write-Host "Failed to download $($file.path): $_"
    }
}
