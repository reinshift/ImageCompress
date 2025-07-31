/**
 * 图表绘制类
 */
class ChartRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.data = [];

        // 图表配置
        this.padding = { top: 40, right: 80, bottom: 60, left: 80 };
        this.gridColor = '#e0e0e0';
        this.compressionRatioColor = '#667eea';
        this.mseColor = '#e74c3c';
        this.textColor = '#555';
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

        // 计算数据范围
        const xMin = 0;
        const xMax = 100;

        // 获取原始数据
        const compressionRatios = this.data.map(d => d.compressionRatio);
        const mseValues = this.data.map(d => d.mse);

        // 对数据进行归一化处理
        const normalizedData = this.normalizeData(compressionRatios, mseValues);

        // 压缩比范围 (左Y轴) - 使用归一化后的数据
        const compressionMin = Math.min(0, Math.min(...normalizedData.compressionRatios));
        const compressionMax = Math.max(...normalizedData.compressionRatios);
        const compressionRange = compressionMax - compressionMin;
        const compressionPadding = compressionRange * 0.1;

        // MSE范围 (右Y轴) - 使用归一化后的数据
        const mseMin = Math.min(...normalizedData.mseValues);
        const mseMax = Math.max(...normalizedData.mseValues);
        const mseRange = mseMax - mseMin;
        const msePadding = mseRange * 0.1;

        // 绘制网格和坐标轴
        this.drawGrid(chartWidth, chartHeight, xMin, xMax,
                     compressionMin - compressionPadding, compressionMax + compressionPadding,
                     mseMin - msePadding, mseMax + msePadding);

        // 绘制压缩比数据线和点 (使用归一化数据)
        this.drawCompressionRatioLine(chartWidth, chartHeight, xMin, xMax,
                                    compressionMin - compressionPadding, compressionMax + compressionPadding,
                                    normalizedData.compressionRatios);
        this.drawCompressionRatioPoints(chartWidth, chartHeight, xMin, xMax,
                                      compressionMin - compressionPadding, compressionMax + compressionPadding,
                                      normalizedData.compressionRatios);

        // 绘制MSE数据线和点 (使用归一化数据)
        this.drawMSELine(chartWidth, chartHeight, xMin, xMax,
                        mseMin - msePadding, mseMax + msePadding,
                        normalizedData.mseValues);
        this.drawMSEPoints(chartWidth, chartHeight, xMin, xMax,
                          mseMin - msePadding, mseMax + msePadding,
                          normalizedData.mseValues);

        // 绘制标签 (显示原始数据范围)
        this.drawLabels(chartWidth, chartHeight,
                       Math.min(...compressionRatios), Math.max(...compressionRatios),
                       Math.min(...mseValues), Math.max(...mseValues));
    }

    /**
     * 对数据进行归一化处理，确保初始两个点有较大差距，后续点根据新数据重新归一化
     */
    normalizeData(compressionRatios, mseValues) {
        if (compressionRatios.length === 0 || mseValues.length === 0) {
            return { compressionRatios: [], mseValues: [] };
        }

        const dataLength = compressionRatios.length;

        // 如果只有1个数据点，将其放在中间位置
        if (dataLength === 1) {
            return {
                compressionRatios: [50],
                mseValues: [50]
            };
        }

        // 如果只有2个数据点，让它们在y轴上有较大差距
        if (dataLength === 2) {
            // 确定哪个值更大，让较大的值在上方(80)，较小的值在下方(20)
            const compRatio1 = compressionRatios[0];
            const compRatio2 = compressionRatios[1];
            const mse1 = mseValues[0];
            const mse2 = mseValues[1];

            let normalizedCompressionRatios, normalizedMseValues;

            // 对压缩比进行分离显示
            if (compRatio1 >= compRatio2) {
                normalizedCompressionRatios = [80, 20];
            } else {
                normalizedCompressionRatios = [20, 80];
            }

            // 对MSE进行分离显示
            if (mse1 >= mse2) {
                normalizedMseValues = [80, 20];
            } else {
                normalizedMseValues = [20, 80];
            }

            return {
                compressionRatios: normalizedCompressionRatios,
                mseValues: normalizedMseValues
            };
        }

        // 如果有3个或更多数据点，进行正常的归一化处理
        const compMin = Math.min(...compressionRatios);
        const compMax = Math.max(...compressionRatios);
        const compRange = compMax - compMin;

        const mseMin = Math.min(...mseValues);
        const mseMax = Math.max(...mseValues);
        const mseRange = mseMax - mseMin;

        // 归一化到10-90范围，避免点贴边，使视觉效果更好
        const normalizedCompressionRatios = compressionRatios.map(value => {
            if (compRange === 0) return 50;
            return 10 + ((value - compMin) / compRange) * 80;
        });

        const normalizedMseValues = mseValues.map(value => {
            if (mseRange === 0) return 50;
            return 10 + ((value - mseMin) / mseRange) * 80;
        });

        return {
            compressionRatios: normalizedCompressionRatios,
            mseValues: normalizedMseValues
        };
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

        // 左Y轴 (压缩比)
        this.ctx.strokeStyle = this.compressionRatioColor;
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left, this.padding.top);
        this.ctx.lineTo(this.padding.left, this.padding.top + chartHeight);
        this.ctx.stroke();

        // 右Y轴 (MSE)
        this.ctx.strokeStyle = this.mseColor;
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left + chartWidth, this.padding.top);
        this.ctx.lineTo(this.padding.left + chartWidth, this.padding.top + chartHeight);
        this.ctx.stroke();
    }

    drawCompressionRatioLine(chartWidth, chartHeight, xMin, xMax, yMin, yMax, normalizedValues = null) {
        if (this.data.length < 2) return;

        this.ctx.strokeStyle = this.compressionRatioColor;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        // 按x值排序
        const sortedData = [...this.data].sort((a, b) => a.singularValueRatio - b.singularValueRatio);
        const values = normalizedValues || this.data.map(d => d.compressionRatio);

        sortedData.forEach((point, index) => {
            const dataIndex = this.data.findIndex(d => d === point);
            const yValue = normalizedValues ? normalizedValues[dataIndex] : point.compressionRatio;

            const x = this.padding.left + ((point.singularValueRatio - xMin) / (xMax - xMin)) * chartWidth;
            const y = this.padding.top + chartHeight - ((yValue - yMin) / (yMax - yMin)) * chartHeight;

            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        this.ctx.stroke();
    }

    drawCompressionRatioPoints(chartWidth, chartHeight, xMin, xMax, yMin, yMax, normalizedValues = null) {
        this.ctx.fillStyle = this.compressionRatioColor;

        this.data.forEach((point, index) => {
            const yValue = normalizedValues ? normalizedValues[index] : point.compressionRatio;

            const x = this.padding.left + ((point.singularValueRatio - xMin) / (xMax - xMin)) * chartWidth;
            const y = this.padding.top + chartHeight - ((yValue - yMin) / (yMax - yMin)) * chartHeight;

            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }

    drawMSELine(chartWidth, chartHeight, xMin, xMax, yMin, yMax, normalizedValues = null) {
        if (this.data.length < 2) return;

        this.ctx.strokeStyle = this.mseColor;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        // 按x值排序
        const sortedData = [...this.data].sort((a, b) => a.singularValueRatio - b.singularValueRatio);

        sortedData.forEach((point, index) => {
            const dataIndex = this.data.findIndex(d => d === point);
            const yValue = normalizedValues ? normalizedValues[dataIndex] : point.mse;

            const x = this.padding.left + ((point.singularValueRatio - xMin) / (xMax - xMin)) * chartWidth;
            const y = this.padding.top + chartHeight - ((yValue - yMin) / (yMax - yMin)) * chartHeight;

            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        this.ctx.stroke();
    }

    drawMSEPoints(chartWidth, chartHeight, xMin, xMax, yMin, yMax, normalizedValues = null) {
        this.ctx.fillStyle = this.mseColor;

        this.data.forEach((point, index) => {
            const yValue = normalizedValues ? normalizedValues[index] : point.mse;

            const x = this.padding.left + ((point.singularValueRatio - xMin) / (xMax - xMin)) * chartWidth;
            const y = this.padding.top + chartHeight - ((yValue - yMin) / (yMax - yMin)) * chartHeight;

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
    }
    
    initializeElements() {
        // 获取DOM元素
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.controlPanel = document.getElementById('controlPanel');
        this.comparisonSection = document.getElementById('comparisonSection');
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

        this.originalSize = document.getElementById('originalSize');
        this.originalFileSize = document.getElementById('originalFileSize');
        this.retainedValues = document.getElementById('retainedValues');
        this.compressionRatioResult = document.getElementById('compressionRatioResult');
        this.mseResult = document.getElementById('mseResult');
        this.compressedFileSize = document.getElementById('compressedFileSize');

        // 看板相关元素
        this.dashboardSection = document.getElementById('dashboardSection');
        this.chartCanvas = document.getElementById('chartCanvas');
        this.chartPlaceholder = document.getElementById('chartPlaceholder');
        this.resetDashboard = document.getElementById('resetDashboard');
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

    smoothScrollToPanel() {
        // 延迟一小段时间，确保DOM元素已经显示
        setTimeout(() => {
            const controlPanel = this.controlPanel;
            if (controlPanel) {
                // 计算目标位置，稍微向上偏移一些，避免紧贴顶部
                const targetPosition = controlPanel.offsetTop - 20;

                // 使用平滑滚动
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }, 300); // 300ms延迟，让显示动画完成
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
    
    loadOriginalImage(img, file) {
        // 获取图像数据
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 限制图像大小以提高性能
        const maxSize = 300;
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // 使用缩放后的canvas作为原始图像显示，确保与压缩图像尺寸一致
        this.originalImage.src = canvas.toDataURL('image/png');
        this.originalImageData = ctx.getImageData(0, 0, width, height);

        // 更新显示信息
        this.originalSize.textContent = `${width} × ${height}`;
        this.originalFileSize.textContent = this.formatFileSize(file.size);

        // 显示对比区域和控制面板
        this.comparisonSection.style.display = 'block';
        this.controlPanel.style.display = 'block';

        // 重置右边的占位图和看板
        this.placeholder.style.display = 'flex';
        this.compressedImage.style.display = 'none';
        this.compressedInfo.style.display = 'none';
        this.downloadSection.style.display = 'none';
        this.dashboardSection.style.display = 'none';
        this.resetChart();

        // 优雅滑动到压缩面板
        this.smoothScrollToPanel();
    }
    
    async compressImage() {
        if (!this.originalImageData) {
            alert('请先上传图像！');
            return;
        }

        // 显示加载指示器
        this.loading.style.display = 'block';
        this.compressBtn.disabled = true;
        this.updateProgress(0, '开始压缩...');

        try {
            const compressionRatio = parseInt(this.compressionSlider.value);

            // 获取压缩方式
            const compressionMethod = document.querySelector('input[name="compressionMethod"]:checked').value;

            // 执行SVD压缩，带进度回调
            const result = await ImageProcessor.compressImage(
                this.originalImageData,
                compressionRatio,
                compressionMethod,
                (progress, message) => this.updateProgress(progress, message)
            );

            // 将压缩后的图像数据转换为可显示的格式
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = this.originalImageData.width;
            canvas.height = this.originalImageData.height;
            ctx.putImageData(result.imageData, 0, 0);

            this.compressedImage.src = canvas.toDataURL('image/png');
            this.compressedImageData = result.imageData;

            // 隐藏占位图，显示压缩结果
            this.placeholder.style.display = 'none';
            this.compressedImage.style.display = 'block';
            this.compressedInfo.style.display = 'block';
            this.downloadSection.style.display = 'block';

            // 计算实际压缩后文件大小
            const compressedSize = this.calculateCompressedSize(result.imageData);

            // 计算文件大小压缩比：(原图大小 - 压缩后大小) / 原图大小
            const fileSizeCompressionRatio = ((this.originalFile.size - compressedSize) / this.originalFile.size * 100).toFixed(1);

            // 计算均方误差
            const mse = ImageProcessor.calculateMSE(this.originalImageData, result.imageData);

            // 更新结果信息
            this.retainedValues.textContent = `${result.retainedSingularValues} / ${result.totalSingularValues}`;
            this.compressionRatioResult.textContent = result.compressionRatio; // 使用数据压缩比
            this.mseResult.textContent = mse.toFixed(2);
            this.compressedFileSize.textContent = this.formatFileSize(compressedSize);

            // 添加数据点到看板
            const singularValueRatio = (result.retainedSingularValues / result.totalSingularValues * 100);
            this.addDataPointToChart(singularValueRatio, parseFloat(result.compressionRatio), mse, result.compressionMethod);

            // 显示看板
            this.dashboardSection.style.display = 'block';

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
    
    calculateCompressedSize(imageData) {
        // 将ImageData转换为PNG格式的Blob来计算实际文件大小
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = imageData.width;
        canvas.height = imageData.height;
        ctx.putImageData(imageData, 0, 0);

        // 使用同步方式获取数据URL并估算大小
        const dataURL = canvas.toDataURL('image/png');

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
        
        // 创建下载链接
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'compressed_image.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ImageCompressorApp();
});
