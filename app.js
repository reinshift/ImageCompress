/**
 * 图表绘制类
 */
class ChartRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.data = [];
        
        // 颜色配置
        this.compressionRatioColor = '#667eea'; // 蓝色
        this.mseColor = '#e74c3c'; // 红色
        this.gridColor = '#e0e0e0';
        this.textColor = '#666';
        
        // 边距配置
        this.padding = {
            top: 40,
            right: 60,
            bottom: 60,
            left: 60
        };
    }

    addDataPoint(singularValueRatio, compressionRatio, mse, compressionMethod = 'count') {
        this.data.push({
            singularValueRatio: singularValueRatio,
            compressionRatio: compressionRatio,
            mse: mse,
            compressionMethod: compressionMethod
        });

        this.render();
    }

    clearData() {
        this.data = [];
        this.render();
    }

    render() {
        if (this.data.length === 0) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const chartWidth = this.canvas.width - this.padding.left - this.padding.right;
        const chartHeight = this.canvas.height - this.padding.top - this.padding.bottom;

        // X轴范围固定
        const xMin = 0;
        const xMax = 100;

        // 获取原始数据
        const compressionRatios = this.data.map(d => d.compressionRatio);
        const mseValues = this.data.map(d => d.mse);

        // 设置固定的初始坐标轴范围
        let compressionMin = 0;
        let compressionMax = 30; // 数据压缩比通常在1-30之间
        let mseMin = 0;
        let mseMax = 100;

        // 如果数据超出当前范围，则扩展范围
        if (this.data.length > 0) {
            const actualCompressionMin = Math.min(...compressionRatios);
            const actualCompressionMax = Math.max(...compressionRatios);
            const actualMseMin = Math.min(...mseValues);
            const actualMseMax = Math.max(...mseValues);



            // 扩展压缩比范围
            if (actualCompressionMin < compressionMin) {
                compressionMin = Math.floor(actualCompressionMin - 1);
            }
            if (actualCompressionMax > compressionMax) {
                compressionMax = Math.ceil(actualCompressionMax + 1);
            }

            // 扩展MSE范围
            if (actualMseMin < mseMin) {
                mseMin = Math.floor(actualMseMin - 5);
            }
            if (actualMseMax > mseMax) {
                mseMax = Math.ceil(actualMseMax + 5);
            }
        }

        const finalCompressionMin = compressionMin;
        const finalCompressionMax = compressionMax;
        const finalMseMin = mseMin;
        const finalMseMax = mseMax;

        // 绘制网格和坐标轴
        this.drawGrid(chartWidth, chartHeight, xMin, xMax, finalCompressionMin, finalCompressionMax, finalMseMin, finalMseMax);

        // 绘制压缩比数据
        this.drawCompressionRatioLine(chartWidth, chartHeight, xMin, xMax, finalCompressionMin, finalCompressionMax);
        this.drawCompressionRatioPoints(chartWidth, chartHeight, xMin, xMax, finalCompressionMin, finalCompressionMax);

        // 绘制MSE数据
        this.drawMSELine(chartWidth, chartHeight, xMin, xMax, finalMseMin, finalMseMax);
        this.drawMSEPoints(chartWidth, chartHeight, xMin, xMax, finalMseMin, finalMseMax);

        // 绘制标签
        this.drawLabels(chartWidth, chartHeight, finalCompressionMin, finalCompressionMax, finalMseMin, finalMseMax);
    }

    drawGrid(chartWidth, chartHeight, xMin, xMax, compressionMin, compressionMax, mseMin, mseMax) {
        this.ctx.strokeStyle = this.gridColor;
        this.ctx.lineWidth = 1;

        // 垂直网格线
        for (let i = 0; i <= 10; i++) {
            const x = this.padding.left + (i / 10) * chartWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.padding.top);
            this.ctx.lineTo(x, this.padding.top + chartHeight);
            this.ctx.stroke();
        }

        // 水平网格线
        for (let i = 0; i <= 10; i++) {
            const y = this.padding.top + (i / 10) * chartHeight;
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding.left, y);
            this.ctx.lineTo(this.padding.left + chartWidth, y);
            this.ctx.stroke();
        }

        // 坐标轴
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;

        // X轴
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left, this.padding.top + chartHeight);
        this.ctx.lineTo(this.padding.left + chartWidth, this.padding.top + chartHeight);
        this.ctx.stroke();

        // Y轴
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left, this.padding.top);
        this.ctx.lineTo(this.padding.left, this.padding.top + chartHeight);
        this.ctx.stroke();
    }

    drawCompressionRatioLine(chartWidth, chartHeight, xMin, xMax, yMin, yMax) {
        if (this.data.length < 2) return;

        this.ctx.strokeStyle = this.compressionRatioColor;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        // 按x值排序
        const sortedData = [...this.data].sort((a, b) => a.singularValueRatio - b.singularValueRatio);

        sortedData.forEach((point, index) => {
            const x = this.padding.left + ((point.singularValueRatio - xMin) / (xMax - xMin)) * chartWidth;
            const y = this.padding.top + chartHeight - ((point.compressionRatio - yMin) / (yMax - yMin)) * chartHeight;

            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        this.ctx.stroke();
    }

    drawCompressionRatioPoints(chartWidth, chartHeight, xMin, xMax, yMin, yMax) {
        this.ctx.fillStyle = this.compressionRatioColor;

        this.data.forEach((point) => {
            const x = this.padding.left + ((point.singularValueRatio - xMin) / (xMax - xMin)) * chartWidth;
            const y = this.padding.top + chartHeight - ((point.compressionRatio - yMin) / (yMax - yMin)) * chartHeight;

            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }

    drawMSELine(chartWidth, chartHeight, xMin, xMax, yMin, yMax) {
        if (this.data.length < 2) return;

        this.ctx.strokeStyle = this.mseColor;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        // 按x值排序
        const sortedData = [...this.data].sort((a, b) => a.singularValueRatio - b.singularValueRatio);

        sortedData.forEach((point, index) => {
            const x = this.padding.left + ((point.singularValueRatio - xMin) / (xMax - xMin)) * chartWidth;
            const y = this.padding.top + chartHeight - ((point.mse - yMin) / (yMax - yMin)) * chartHeight;

            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        this.ctx.stroke();
    }

    drawMSEPoints(chartWidth, chartHeight, xMin, xMax, yMin, yMax) {
        this.ctx.fillStyle = this.mseColor;

        this.data.forEach((point) => {
            const x = this.padding.left + ((point.singularValueRatio - xMin) / (xMax - xMin)) * chartWidth;
            const y = this.padding.top + chartHeight - ((point.mse - yMin) / (yMax - yMin)) * chartHeight;

            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }

    drawLabels(chartWidth, chartHeight, compressionMin, compressionMax, mseMin, mseMax) {
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';

        // X轴标签
        this.ctx.fillStyle = this.textColor;
        for (let i = 0; i <= 10; i++) {
            const x = this.padding.left + (i / 10) * chartWidth;
            const value = (i * 10).toString() + '%';
            this.ctx.fillText(value, x, this.padding.top + chartHeight + 20);
        }

        // X轴标题
        this.ctx.font = '14px Arial';
        this.ctx.fillText('奇异值保留比例', this.padding.left + chartWidth / 2, this.padding.top + chartHeight + 45);

        // 左Y轴标签 (压缩比)
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = this.compressionRatioColor;
        for (let i = 0; i <= 10; i++) {
            const y = this.padding.top + chartHeight - (i / 10) * chartHeight;
            const value = (compressionMin + (compressionMax - compressionMin) * (i / 10)).toFixed(1);
            this.ctx.fillText(value, this.padding.left - 10, y + 4);
        }

        // 右Y轴标签 (MSE)
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = this.mseColor;
        for (let i = 0; i <= 10; i++) {
            const y = this.padding.top + chartHeight - (i / 10) * chartHeight;
            const value = (mseMin + (mseMax - mseMin) * (i / 10)).toFixed(1);
            this.ctx.fillText(value, this.padding.left + chartWidth + 10, y + 4);
        }

        // 左Y轴标题 (压缩比)
        this.ctx.save();
        this.ctx.translate(20, this.padding.top + chartHeight / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = this.compressionRatioColor;
        this.ctx.fillText('压缩比 (%)', 0, 0);
        this.ctx.restore();

        // 右Y轴标题 (MSE)
        this.ctx.save();
        this.ctx.translate(this.canvas.width - 20, this.padding.top + chartHeight / 2);
        this.ctx.rotate(Math.PI / 2);
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = this.mseColor;
        this.ctx.fillText('均方误差 (px²)', 0, 0);
        this.ctx.restore();
    }
}

/**
 * 主应用逻辑
 */

class ImageCompressorApp {
    constructor() {
        this.originalImageData = null;
        this.compressedImageData = null;
        this.originalFile = null;

        this.initializeElements();
        this.bindEvents();
        this.initializeChart();

        console.log('ImageCompressorApp initialized');
    }
    
    initializeElements() {
        // 获取DOM元素
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.controlPanel = document.getElementById('controlPanel');
        this.loading = document.getElementById('loading');

        this.compressionSlider = document.getElementById('compressionRatio');
        this.ratioValue = document.getElementById('ratioValue');
        this.compressBtn = document.getElementById('compressBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.downloadSection = document.getElementById('downloadSection');

        this.loadingText = document.getElementById('loadingText');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');

        this.originalImage = document.getElementById('originalImage');
        this.compressedImage = document.getElementById('compressedImage');
        this.placeholder = document.getElementById('placeholder');
        this.compressedInfo = document.getElementById('compressedInfo');
        this.originalInfo = document.getElementById('originalInfo');

        this.originalSize = document.getElementById('originalSize');
        this.originalFileSize = document.getElementById('originalFileSize');
        this.imageType = document.getElementById('imageType');
        this.retainedValues = document.getElementById('retainedValues');
        this.compressionRatioResult = document.getElementById('compressionRatioResult');
        this.fileCompressionRatio = document.getElementById('fileCompressionRatio');
        this.mseResult = document.getElementById('mseResult');
        this.compressedFileSize = document.getElementById('compressedFileSize');
        this.processingMethod = document.getElementById('processingMethod');

        // 看板相关元素
        this.dashboardSection = document.getElementById('dashboardSection');
        this.chartCanvas = document.getElementById('chartCanvas');
        this.chartPlaceholder = document.getElementById('chartPlaceholder');
        this.resetDashboard = document.getElementById('resetDashboard');

        // 测试图片容器
        this.testImagesContainer = document.getElementById('testImagesContainer');

        // RGB分通道显示元素
        this.rgbChannels = document.getElementById('rgbChannels');
        this.redChannelImage = document.getElementById('redChannelImage');
        this.greenChannelImage = document.getElementById('greenChannelImage');
        this.blueChannelImage = document.getElementById('blueChannelImage');
    }
    
    bindEvents() {
        // 文件上传事件
        this.uploadArea.addEventListener('click', () => {
            this.fileInput.click();
        });
        
        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });
        
        // 拖拽上传
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleFileSelect(file);
            }
        });
        
        // 滑块事件
        this.compressionSlider.addEventListener('input', (e) => {
            this.ratioValue.textContent = e.target.value + '%';
        });
        
        // 压缩按钮事件
        this.compressBtn.addEventListener('click', () => {
            this.compressImage();
        });
        
        // 下载按钮事件
        this.downloadBtn.addEventListener('click', () => {
            this.downloadCompressedImage();
        });

        // 看板相关事件
        this.resetDashboard.addEventListener('click', () => {
            this.resetChart();
        });

        // 测试图片点击事件
        this.testImagesContainer.addEventListener('click', (e) => {
            console.log('Test images container clicked', e.target);
            const testImageItem = e.target.closest('.test-image-item');
            if (testImageItem) {
                console.log('Test image item found:', testImageItem.dataset.image);
                this.handleTestImageSelect(testImageItem);
            } else {
                console.log('No test image item found');
            }
        });
    }

    initializeChart() {
        // 设置canvas的实际尺寸
        this.resizeCanvas();
        this.chart = new ChartRenderer(this.chartCanvas);

        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            if (this.chart.data.length > 0) {
                this.chart.render();
            }
        });
    }

    resizeCanvas() {
        const container = this.chartCanvas.parentElement;
        const containerWidth = container.clientWidth - 40; // 减去padding
        const containerHeight = Math.min(400, containerWidth * 0.5); // 保持合适的宽高比

        this.chartCanvas.width = Math.max(600, containerWidth);
        this.chartCanvas.height = Math.max(300, containerHeight);
    }

    resetChart() {
        this.chart.clearData();
        this.chartCanvas.style.display = 'none';
        this.chartPlaceholder.style.display = 'flex';
    }

    addDataPointToChart(singularValueRatio, compressionRatio, mse, compressionMethod) {
        // 检查是否已经有相同奇异值比例的数据点
        const existingPoint = this.chart.data.find(point =>
            Math.abs(point.singularValueRatio - singularValueRatio) < 0.1
        );

        if (!existingPoint) {
            // 如果是新的奇异值比例，为了演示效果，我们可以同时添加两种压缩方式的数据点
            // 这里我们添加当前的数据点
            this.chart.addDataPoint(singularValueRatio, compressionRatio, mse, compressionMethod);

            // 如果用户希望看到对比效果，可以在这里添加另一种压缩方式的预估数据点
            // 但为了准确性，我们只添加实际计算的数据点
        } else {
            // 如果已经存在相同比例的数据点，直接添加新的数据点
            this.chart.addDataPoint(singularValueRatio, compressionRatio, mse, compressionMethod);
        }

        // 显示图表，隐藏占位符
        this.chartCanvas.style.display = 'block';
        this.chartPlaceholder.style.display = 'none';
    }
    
    handleFileSelect(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('请选择有效的图像文件！');
            return;
        }

        this.originalFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.loadOriginalImage(img, file);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    handleTestImageSelect(testImageItem) {
        console.log('Test image selected:', testImageItem.dataset.image);

        // 移除之前选中的状态
        document.querySelectorAll('.test-image-item').forEach(item => {
            item.classList.remove('selected');
        });

        // 添加选中状态
        testImageItem.classList.add('selected');

        // 获取图片路径
        const imagePath = testImageItem.dataset.image;

        // 创建一个隐藏的文件输入来模拟文件选择
        this.simulateFileUpload(imagePath);
    }

    simulateFileUpload(imagePath) {
        console.log('Using test image directly:', imagePath);

        // 直接使用页面中已经加载的图片元素
        this.useExistingTestImage(imagePath);
    }

    useExistingTestImage(imagePath) {
        console.log('Loading test image and converting to data URL:', imagePath);

        // 新方法：先将图片转换为data URL，然后再使用
        this.convertImageToDataURL(imagePath);
    }

    convertImageToDataURL(imagePath) {
        // 创建一个临时的Image对象来加载图片
        const tempImg = new Image();

        tempImg.onload = () => {
            console.log('Temp image loaded, converting to data URL:', imagePath);

            try {
                // 创建临时canvas来转换图片为data URL
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');

                tempCanvas.width = tempImg.width;
                tempCanvas.height = tempImg.height;

                // 绘制图片到临时canvas
                tempCtx.drawImage(tempImg, 0, 0);

                // 转换为data URL
                const dataURL = tempCanvas.toDataURL('image/jpeg', 0.9);
                console.log('Successfully converted to data URL');

                // 现在使用data URL创建新的Image对象
                this.useDataURLImage(dataURL, imagePath);

            } catch (error) {
                console.error('Failed to convert to data URL:', error);
                // 如果转换失败，回退到直接使用路径
                this.useDirectPath(imagePath);
            }
        };

        tempImg.onerror = (error) => {
            console.error('Failed to load temp image:', imagePath, error);
            alert(`无法加载测试图片: ${imagePath}\n请确保图片文件存在。`);

            // 移除选中状态
            document.querySelectorAll('.test-image-item').forEach(item => {
                item.classList.remove('selected');
            });
        };

        // 直接设置图片路径
        tempImg.src = imagePath;
    }

    useDataURLImage(dataURL, originalPath) {
        console.log('Using data URL image');

        const img = new Image();

        img.onload = () => {
            console.log('Data URL image loaded successfully:', img.width, 'x', img.height);

            // 现在这个图像应该是"干净"的，可以安全地进行canvas操作
            this.processLoadedTestImage(img, originalPath);
        };

        img.onerror = (error) => {
            console.error('Failed to load data URL image:', error);
            // 回退到直接使用路径
            this.useDirectPath(originalPath);
        };

        // 使用data URL
        img.src = dataURL;
    }

    useDirectPath(imagePath) {
        console.log('Using direct path as fallback:', imagePath);

        const img = new Image();

        img.onload = () => {
            console.log('Direct path image loaded:', imagePath, img.width, 'x', img.height);
            this.processLoadedTestImage(img, imagePath);
        };

        img.onerror = (error) => {
            console.error('Direct path also failed:', error);
            alert(`无法加载测试图片: ${imagePath}`);

            // 移除选中状态
            document.querySelectorAll('.test-image-item').forEach(item => {
                item.classList.remove('selected');
            });
        };

        img.src = imagePath;
    }

    processTestImageDirectly(imgElement, imagePath) {
        try {
            console.log('Processing test image directly:', imagePath);

            // 尝试使用URL.createObjectURL创建临时引用
            this.createObjectURLFromImage(imgElement, imagePath);

        } catch (error) {
            console.error('Error processing test image directly:', error);
            alert('处理测试图片时出错: ' + error.message);
        }
    }

    createObjectURLFromImage(imgElement, imagePath) {
        try {
            console.log('Creating object URL from image element');

            // 创建一个canvas来重新绘制图像
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // 设置canvas尺寸，考虑缩放
            let width = imgElement.naturalWidth;
            let height = imgElement.naturalHeight;
            const originalWidth = width;
            const originalHeight = height;
            const maxSize = 800;
            let shouldScale = false;

            if (width > maxSize || height > maxSize) {
                const scaleRatio = Math.min(maxSize / width, maxSize / height);
                width = Math.floor(width * scaleRatio);
                height = Math.floor(height * scaleRatio);
                shouldScale = true;
                console.log('Scaling image from', originalWidth, 'x', originalHeight, 'to', width, 'x', height);
            }

            canvas.width = width;
            canvas.height = height;

            // 绘制图像到canvas
            ctx.drawImage(imgElement, 0, 0, width, height);

            // 将canvas转换为blob，然后创建object URL
            canvas.toBlob((blob) => {
                if (blob) {
                    console.log('Canvas to blob successful, creating object URL');
                    const objectURL = URL.createObjectURL(blob);

                    // 使用object URL创建新的图像
                    this.loadImageFromObjectURL(objectURL, imagePath, originalWidth, originalHeight, shouldScale);
                } else {
                    console.error('Canvas to blob failed');
                    // 如果toBlob失败，尝试直接获取图像数据
                    this.fallbackToDirectProcessing(canvas, imagePath, originalWidth, originalHeight, shouldScale);
                }
            }, 'image/png');

        } catch (error) {
            console.error('Error creating object URL:', error);
            // 最后的备用方案
            this.fallbackToDirectProcessing(null, imagePath, imgElement.naturalWidth, imgElement.naturalHeight, false);
        }
    }

    loadImageFromObjectURL(objectURL, imagePath, originalWidth, originalHeight, shouldScale) {
        try {
            console.log('Loading image from object URL');

            const img = new Image();

            img.onload = () => {
                console.log('Object URL image loaded successfully');

                // 现在这个图像应该是"干净"的，可以安全地进行canvas操作
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                try {
                    // 尝试获取图像数据
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    console.log('Successfully got image data from object URL image');

                    // 设置原始图像数据
                    this.originalImageData = imageData;

                    // 更新UI
                    this.updateUIWithObjectURL(objectURL, imagePath, originalWidth, originalHeight, shouldScale);

                } catch (getImageDataError) {
                    console.error('getImageData still failed with object URL:', getImageDataError);
                    // 清理object URL
                    URL.revokeObjectURL(objectURL);
                    // 使用备用方案
                    this.fallbackToDirectProcessing(canvas, imagePath, originalWidth, originalHeight, shouldScale);
                }
            };

            img.onerror = () => {
                console.error('Failed to load image from object URL');
                URL.revokeObjectURL(objectURL);
                this.fallbackToDirectProcessing(null, imagePath, originalWidth, originalHeight, shouldScale);
            };

            img.src = objectURL;

        } catch (error) {
            console.error('Error loading image from object URL:', error);
            URL.revokeObjectURL(objectURL);
            this.fallbackToDirectProcessing(null, imagePath, originalWidth, originalHeight, shouldScale);
        }
    }

    updateUIWithObjectURL(objectURL, imagePath, originalWidth, originalHeight, shouldScale) {
        try {
            // 使用object URL显示图像
            this.originalImage.src = objectURL;

            // 检测图像类型
            const imageType = ImageProcessor.detectImageType(this.originalImageData);
            const imageTypeText = imageType === 'grayscale' ? '黑白图像' : '彩色图像';
            console.log('Detected image type:', imageTypeText);

            // 创建模拟文件对象
            const fileName = imagePath.split('/').pop();
            this.originalFile = {
                name: fileName,
                size: this.originalImageData.width * this.originalImageData.height * 4,
                type: 'image/png'
            };

            // 更新显示信息
            if (shouldScale) {
                this.originalSize.textContent = `${originalWidth} × ${originalHeight} (缩放至 ${this.originalImageData.width} × ${this.originalImageData.height})`;
            } else {
                this.originalSize.textContent = `${this.originalImageData.width} × ${this.originalImageData.height}`;
            }
            this.originalFileSize.textContent = this.formatFileSize(this.originalFile.size);
            this.imageType.textContent = imageTypeText;

            // 显示原始图像和信息
            this.uploadArea.style.display = 'none';
            this.originalImage.style.display = 'block';
            this.originalInfo.style.display = 'block';

            // 重置右边的占位图和看板
            this.placeholder.style.display = 'flex';
            this.compressedImage.style.display = 'none';
            this.compressedInfo.style.display = 'none';
            this.downloadSection.style.display = 'none';
            this.rgbChannels.style.display = 'none';
            this.resetChart();

            console.log('UI updated with object URL successfully');

            // 延迟清理object URL，给图像加载一些时间
            setTimeout(() => {
                URL.revokeObjectURL(objectURL);
                console.log('Object URL revoked');
            }, 1000);

        } catch (error) {
            console.error('Error updating UI with object URL:', error);
            URL.revokeObjectURL(objectURL);
            alert('更新界面时出错: ' + error.message);
        }
    }

    fallbackToDirectProcessing(canvas, imagePath, originalWidth, originalHeight, shouldScale) {
        console.log('Using fallback to direct processing');

        if (!canvas) {
            // 如果没有canvas，直接使用原始图片路径
            this.originalImage.src = imagePath;
            alert('无法处理测试图片的像素数据，但已显示原始图片。建议使用文件上传功能。');
            return;
        }

        // 尝试直接处理canvas（即使可能失败）
        this.extractPixelDataManually(canvas, imagePath, originalWidth, originalHeight, shouldScale);
    }

    extractPixelDataManually(canvas, imagePath, originalWidth, originalHeight, shouldScale) {
        try {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            // 尝试获取图像数据
            try {
                const imageData = ctx.getImageData(0, 0, width, height);
                console.log('Successfully got image data using getImageData');

                // 设置原始图像数据
                this.originalImageData = imageData;

                console.log('Original image data set:', {
                    exists: !!this.originalImageData,
                    width: this.originalImageData.width,
                    height: this.originalImageData.height,
                    dataLength: this.originalImageData.data.length
                });

                // 更新UI显示
                this.updateUIForTestImageSafely(imagePath, originalWidth, originalHeight, shouldScale, true);

            } catch (getImageDataError) {
                console.error('getImageData failed:', getImageDataError.message);
                // 不使用生成数据，直接告知用户失败
                alert(`无法获取图片的像素数据：${getImageDataError.message}\n\n建议：\n1. 使用文件上传功能选择图片\n2. 或使用本地服务器运行项目`);

                // 移除选中状态
                document.querySelectorAll('.test-image-item').forEach(item => {
                    item.classList.remove('selected');
                });
            }

        } catch (error) {
            console.error('Error extracting pixel data:', error);
            alert('提取图像数据时出错: ' + error.message);
        }
    }



    updateUIForTestImageSafely(imagePath, originalWidth, originalHeight, shouldScale, getImageDataSuccess) {
        try {
            // 直接使用原始图片路径，避免canvas操作
            const testImageItem = document.querySelector(`[data-image="${imagePath}"]`);
            const originalImgElement = testImageItem ? testImageItem.querySelector('img') : null;

            if (originalImgElement && originalImgElement.src) {
                this.originalImage.src = originalImgElement.src;
                console.log('Using original image src for display');
            } else {
                console.log('Original image element not found, using path');
                this.originalImage.src = imagePath;
            }

            // 检测图像类型
            const imageType = ImageProcessor.detectImageType(this.originalImageData);
            const imageTypeText = imageType === 'grayscale' ? '黑白图像' : '彩色图像';
            console.log('Detected image type:', imageTypeText);

            // 创建模拟文件对象
            const fileName = imagePath.split('/').pop();
            this.originalFile = {
                name: fileName,
                size: this.originalImageData.width * this.originalImageData.height * 4,
                type: 'image/png'
            };

            // 更新显示信息
            if (shouldScale) {
                this.originalSize.textContent = `${originalWidth} × ${originalHeight} (缩放至 ${this.originalImageData.width} × ${this.originalImageData.height})`;
            } else {
                this.originalSize.textContent = `${this.originalImageData.width} × ${this.originalImageData.height}`;
            }
            this.originalFileSize.textContent = this.formatFileSize(this.originalFile.size);
            this.imageType.textContent = imageTypeText;

            // 显示原始图像和信息
            this.uploadArea.style.display = 'none';
            this.originalImage.style.display = 'block';
            this.originalInfo.style.display = 'block';

            // 重置右边的占位图和看板
            this.placeholder.style.display = 'flex';
            this.compressedImage.style.display = 'none';
            this.compressedInfo.style.display = 'none';
            this.downloadSection.style.display = 'none';
            this.rgbChannels.style.display = 'none';
            this.resetChart();

            console.log('Test image UI updated successfully');

        } catch (error) {
            console.error('Error updating UI safely:', error);
            alert('更新界面时出错: ' + error.message);
        }
    }










    loadOriginalImage(img, file) {
        // 获取图像数据
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let { width, height } = img;
        const originalWidth = width;
        const originalHeight = height;

        // 智能缩放：如果图像过大影响性能，则适当缩放，但不强制裁剪
        const maxSize = 800; // 提高最大尺寸限制
        let shouldScale = false;
        let scaleRatio = 1;

        if (width > maxSize || height > maxSize) {
            scaleRatio = Math.min(maxSize / width, maxSize / height);
            width = Math.floor(width * scaleRatio);
            height = Math.floor(height * scaleRatio);
            shouldScale = true;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // 使用缩放后的canvas作为原始图像显示
        this.originalImage.src = canvas.toDataURL('image/png');
        this.originalImageData = ctx.getImageData(0, 0, width, height);

        // 检测图像类型
        const imageType = ImageProcessor.detectImageType(this.originalImageData);
        const imageTypeText = imageType === 'grayscale' ? '黑白图像' : '彩色图像';

        // 更新显示信息
        if (shouldScale) {
            this.originalSize.textContent = `${originalWidth} × ${originalHeight} (缩放至 ${width} × ${height})`;
        } else {
        this.originalSize.textContent = `${width} × ${height}`;
        }
        this.originalFileSize.textContent = this.formatFileSize(file.size);
        this.imageType.textContent = imageTypeText;

        // 显示原始图像和信息
        this.uploadArea.style.display = 'none';
        this.originalImage.style.display = 'block';
        this.originalInfo.style.display = 'block';

        // 重置右边的占位图和看板
        this.placeholder.style.display = 'flex';
        this.compressedImage.style.display = 'none';
        this.compressedInfo.style.display = 'none';
        this.downloadSection.style.display = 'none';
        this.rgbChannels.style.display = 'none';
        this.resetChart();
    }
    
    async compressImage() {
        console.log('Compress button clicked');
        console.log('Original image data exists:', !!this.originalImageData);

        if (!this.originalImageData) {
            console.error('No original image data found');
            alert('请先上传图像！');
            return;
        }

        console.log('Starting compression...');

        // 显示加载指示器
        this.loading.style.display = 'block';
        this.compressBtn.disabled = true;
        
        const startTime = performance.now();
        this.updateProgress(0, '开始压缩...');

        try {
            const compressionRatio = parseInt(this.compressionSlider.value);
            const compressionMethod = document.querySelector('input[name="compressionMethod"]:checked').value;

            // 显示图像信息
            const { width, height } = this.originalImageData;
            const totalPixels = width * height;
            console.log(`开始压缩图像: ${width}×${height} = ${totalPixels} 像素`);

            // 执行SVD压缩，带进度回调
            const result = await ImageProcessor.compressImage(
                this.originalImageData,
                compressionRatio,
                compressionMethod,
                (progress, message) => this.updateProgress(progress, message)
            );

            const endTime = performance.now();
            const processingTime = ((endTime - startTime) / 1000).toFixed(2);
            console.log(`压缩完成，耗时: ${processingTime}秒`);

            // 将压缩后的图像数据转换为可显示的格式
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = this.originalImageData.width;
            canvas.height = this.originalImageData.height;
            ctx.putImageData(result.imageData, 0, 0);

            // 使用JPEG格式保存压缩后的图像，优化文件大小
            const jpegQuality = this.calculateOptimalJPEGQuality(compressionRatio, result);
            this.compressedImage.src = canvas.toDataURL('image/jpeg', jpegQuality);
            this.compressedImageData = result.imageData;

            // 隐藏占位图，显示压缩结果
            this.placeholder.style.display = 'none';
            this.compressedImage.style.display = 'block';
            this.compressedInfo.style.display = 'block';
            this.downloadSection.style.display = 'block';

            // 如果是RGB图像，显示分通道结果
            if (result.imageType === 'rgb' && result.channelMatrices) {
                this.displayRGBChannels(result.channelMatrices, this.originalImageData.width, this.originalImageData.height);
            } else {
                this.rgbChannels.style.display = 'none';
            }

            // 计算实际压缩后文件大小
            const compressedSize = this.calculateCompressedSize(result.imageData, jpegQuality);
            const originalSize = this.originalFile ? this.originalFile.size : 0;
            const actualCompressionRatio = originalSize > 0 ? (originalSize / compressedSize).toFixed(2) : 'N/A';

            // 计算均方误差
            const mse = ImageProcessor.calculateMSE(this.originalImageData, result.imageData);

            // 更新结果信息
            if (result.compressionMethod === 'sum') {
                const actualRatio = ((result.retainedSingularValues / result.totalSingularValues) * 100).toFixed(1);
                this.retainedValues.textContent = `${result.retainedSingularValues} / ${result.totalSingularValues} (${actualRatio}%)`;
            } else {
                this.retainedValues.textContent = `${result.retainedSingularValues} / ${result.totalSingularValues}`;
            }
            
            this.compressionRatioResult.textContent = result.compressionRatio;
            this.fileCompressionRatio.textContent = actualCompressionRatio;
            this.mseResult.textContent = mse.toFixed(2);
            this.compressedFileSize.textContent = this.formatFileSize(compressedSize);

            // 显示处理方式
            const methodText = result.compressionMethod === 'count' ? '按奇异值个数占比' : '按奇异值之和占比';
            const imageTypeText = result.imageType === 'grayscale' ? '黑白图像' : '彩色图像';
            
            // 在按奇异值之和占比模式下，显示更详细的信息
            if (result.compressionMethod === 'sum') {
                const actualRatio = ((result.retainedSingularValues / result.totalSingularValues) * 100).toFixed(1);
                this.processingMethod.textContent = `${imageTypeText} - ${methodText} (实际使用${actualRatio}%的奇异值)`;
            } else {
                this.processingMethod.textContent = `${imageTypeText} - ${methodText}`;
            }

            // 添加数据点到看板
            const singularValueRatio = (result.retainedSingularValues / result.totalSingularValues * 100);
            this.addDataPointToChart(singularValueRatio, parseFloat(result.compressionRatio), mse, result.compressionMethod);

            // 显示性能信息
            console.log(`图像类型: ${imageTypeText}`);
            console.log(`压缩方式: ${methodText}`);
            console.log(`处理时间: ${processingTime}秒`);
            console.log(`数据压缩比: ${result.compressionRatio}`);
            console.log(`实际文件压缩比: ${actualCompressionRatio}`);
            console.log(`JPEG质量: ${jpegQuality.toFixed(2)}`);
            
            // 添加奇异值详细信息
            if (result.compressionMethod === 'sum') {
                const actualRatio = ((result.retainedSingularValues / result.totalSingularValues) * 100).toFixed(1);
                console.log(`奇异值之和占比模式:`);
                console.log(`  设置保留比例: ${compressionRatio}%`);
                console.log(`  实际使用奇异值: ${result.retainedSingularValues} / ${result.totalSingularValues} (${actualRatio}%)`);
            } else {
                console.log(`奇异值个数占比模式:`);
                console.log(`  设置保留比例: ${compressionRatio}%`);
                console.log(`  实际使用奇异值: ${result.retainedSingularValues} / ${result.totalSingularValues}`);
            }

        } catch (error) {
            console.error('压缩过程中出现错误:', error);
            alert('压缩过程中出现错误，请重试！');
        } finally {
            // 隐藏加载指示器
            this.loading.style.display = 'none';
            this.compressBtn.disabled = false;
        }
    }

    updateProgress(percentage, message) {
        this.progressBar.style.width = percentage + '%';
        this.progressText.textContent = percentage + '%';
        this.loadingText.textContent = message;
    }
    
    calculateCompressedSize(imageData, jpegQuality) {
        // 将ImageData转换为PNG格式的Blob来计算实际文件大小
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = imageData.width;
        canvas.height = imageData.height;
        ctx.putImageData(imageData, 0, 0);

        // 使用同步方式获取数据URL并估算大小
        const dataURL = canvas.toDataURL('image/jpeg', jpegQuality);

        // 从data URL计算大小（去掉data:image/png;base64,前缀）
        const base64String = dataURL.split(',')[1];
        const sizeInBytes = Math.floor(base64String.length * 0.75); // Base64编码大约比原始数据大33%

        return sizeInBytes;
    }
    
    downloadCompressedImage() {
        if (!this.compressedImageData) {
            alert('没有可下载的压缩图像！');
            return;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.compressedImageData.width;
        canvas.height = this.compressedImageData.height;
        ctx.putImageData(this.compressedImageData, 0, 0);
        
        // 获取当前压缩设置
        const compressionRatio = parseInt(this.compressionSlider.value);
        const jpegQuality = this.calculateOptimalJPEGQuality(compressionRatio, {
            imageType: this.imageType.textContent.includes('黑白') ? 'grayscale' : 'rgb'
        });
        
        // 创建下载链接，使用JPEG格式以减小文件大小
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'compressed_image.jpg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/jpeg', jpegQuality);
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    calculateOptimalJPEGQuality(compressionRatio, result) {
        const jpegQuality = Math.max(0.3, compressionRatio / 100);
        const imageType = result.imageType;
        const totalSingularValues = result.totalSingularValues;
        const retainedSingularValues = result.retainedSingularValues;

                 // 如果图像类型是彩色，且压缩比例较低，则降低质量以减少文件大小
         if (imageType === 'rgb' && compressionRatio < 20) {
             return Math.max(0.1, jpegQuality * 0.7); // 降低质量
         }
         // 如果图像类型是彩色，且压缩比例较高，则提高质量以保持图像质量
         if (imageType === 'rgb' && compressionRatio > 50) {
             return Math.min(0.9, jpegQuality * 1.2); // 提高质量
         }
         // 如果图像类型是黑白，且压缩比例较低，则降低质量
         if (imageType === 'grayscale' && compressionRatio < 10) {
             return Math.max(0.1, jpegQuality * 0.8); // 降低质量
         }
         // 如果图像类型是黑白，且压缩比例较高，则提高质量
         if (imageType === 'grayscale' && compressionRatio > 30) {
             return Math.min(0.9, jpegQuality * 1.1); // 提高质量
         }

        return jpegQuality;
    }

    displayRGBChannels(channelMatrices, width, height) {
        const channels = [
            { name: 'r', element: this.redChannelImage, matrix: channelMatrices.r },
            { name: 'g', element: this.greenChannelImage, matrix: channelMatrices.g },
            { name: 'b', element: this.blueChannelImage, matrix: channelMatrices.b }
        ];

        channels.forEach(channel => {
            // 创建单通道图像数据
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = width;
            canvas.height = height;

            const imageData = ctx.createImageData(width, height);
            const data = imageData.data;

            // 将单通道矩阵转换为图像数据
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    const value = Math.max(0, Math.min(255, Math.round(channel.matrix[y][x])));

                    if (channel.name === 'r') {
                        data[idx] = value;     // Red
                        data[idx + 1] = 0;     // Green
                        data[idx + 2] = 0;     // Blue
                    } else if (channel.name === 'g') {
                        data[idx] = 0;         // Red
                        data[idx + 1] = value; // Green
                        data[idx + 2] = 0;     // Blue
                    } else { // 'b'
                        data[idx] = 0;         // Red
                        data[idx + 1] = 0;     // Green
                        data[idx + 2] = value; // Blue
                    }
                    data[idx + 3] = 255;       // Alpha
                }
            }

            ctx.putImageData(imageData, 0, 0);
            channel.element.src = canvas.toDataURL('image/png');
        });

        // 显示RGB分通道区域
        this.rgbChannels.style.display = 'grid';
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ImageCompressorApp();
});
