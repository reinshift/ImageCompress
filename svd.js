/**
 * SVD (奇异值分解) 算法实现
 * 用于图像压缩 - 重构的高效SVD算法
 */

class SVD {
    /**
     * 使用优化的幂迭代法进行SVD分解
     * @param {number[][]} matrix - 输入矩阵
     * @param {function} progressCallback - 进度回调函数
     * @returns {Object} 包含U, sigma, V_T的对象
     */
    static decompose(matrix, progressCallback = null) {
        const A = matrix.map(row => [...row]); // 复制矩阵
        const m = A.length;
        const n = A[0].length;
        const minDim = Math.min(m, n);

        if (progressCallback) progressCallback(10, '开始SVD分解...');

        // 根据矩阵大小调整计算精度
        const isLargeMatrix = m * n > 100000; // 超过10万像素的矩阵
        const maxEigenvalues = isLargeMatrix ? Math.min(minDim, 50) : Math.min(minDim, 100);
        const tolerance = isLargeMatrix ? 1e-8 : 1e-10;

        // 计算 A^T * A 和 A * A^T
        const AtA = this.multiplyMatrices(this.transpose(A), A);
        const AAt = this.multiplyMatrices(A, this.transpose(A));

        if (progressCallback) progressCallback(30, '计算特征值...');

        // 对A^T*A进行特征值分解得到V和奇异值的平方
        const eigenV = this.eigenDecomposition(AtA, maxEigenvalues, tolerance, (progress) => {
            if (progressCallback) {
                progressCallback(30 + progress * 0.3, '计算V矩阵特征值...');
            }
        });

        if (progressCallback) progressCallback(60, '计算U矩阵...');

        // 对A*A^T进行特征值分解得到U
        const eigenU = this.eigenDecomposition(AAt, maxEigenvalues, tolerance, (progress) => {
            if (progressCallback) {
                progressCallback(60 + progress * 0.3, '计算U矩阵特征值...');
            }
        });

        // 提取奇异值（特征值的平方根）
        const sigma = eigenV.values.map(val => Math.sqrt(Math.max(0, val)));

        // 按奇异值降序排序
        const indices = sigma.map((val, idx) => ({ val, idx }))
            .sort((a, b) => b.val - a.val)
            .map(item => item.idx);

        const sortedSigma = indices.map(i => sigma[i]);
        const V_T = indices.map(i => eigenV.vectors[i]);

        // 计算U矩阵
        const U = [];
        for (let i = 0; i < Math.min(m, n); i++) {
            if (sortedSigma[i] > tolerance) {
                // u_i = A * v_i / sigma_i
                const v_i = V_T[i];
                const Av = this.multiplyMatrixVector(A, v_i);
                const u_i = Av.map(val => val / sortedSigma[i]);
                U.push(u_i);
            } else {
                U.push(new Array(m).fill(0));
            }
        }

        if (progressCallback) progressCallback(100, 'SVD分解完成');

        return {
            U: this.transpose(U),
            sigma: sortedSigma,
            V_T: V_T
        };
    }

    /**
     * 优化的特征值分解 (使用改进的幂迭代法)
     */
    static eigenDecomposition(matrix, maxEigenvalues = 100, tolerance = 1e-10, progressCallback = null) {
        const n = matrix.length;
        const maxIterations = 200; // 减少迭代次数以提高性能

        const eigenValues = [];
        const eigenVectors = [];

        // 复制矩阵
        let A = matrix.map(row => [...row]);

        for (let k = 0; k < maxEigenvalues; k++) {
            if (progressCallback) {
                progressCallback((k / maxEigenvalues) * 100);
            }

            // 幂迭代法求主特征值和特征向量
            let v = new Array(n);
            // 更好的初始化 - 使用随机正交向量
            for (let i = 0; i < n; i++) {
                v[i] = Math.random() - 0.5;
            }

            // 归一化初始向量
            let norm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
            if (norm > tolerance) {
                v = v.map(val => val / norm);
            }

            let lambda = 0;
            let converged = false;

            for (let iter = 0; iter < maxIterations; iter++) {
                const Av = this.multiplyMatrixVector(A, v);

                // 归一化
                norm = Math.sqrt(Av.reduce((sum, val) => sum + val * val, 0));
                if (norm < tolerance) break;

                v = Av.map(val => val / norm);

                // 计算瑞利商
                const vAv = v.reduce((sum, val, i) => {
                    let rowSum = 0;
                    for (let j = 0; j < n; j++) {
                        rowSum += A[i][j] * v[j];
                    }
                    return sum + val * rowSum;
                }, 0);

                const newLambda = vAv;
                if (Math.abs(newLambda - lambda) < tolerance) {
                    lambda = newLambda;
                    converged = true;
                    break;
                }
                lambda = newLambda;
            }

            if (Math.abs(lambda) < tolerance || !converged) {
                break;
            }

            eigenValues.push(lambda);
            eigenVectors.push([...v]);

            // Deflation: 从矩阵中移除这个特征值的贡献
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    A[i][j] -= lambda * v[i] * v[j];
                }
            }
        }

        return { values: eigenValues, vectors: eigenVectors };
    }

    /**
     * 根据奇异值个数占比重构矩阵
     * @param {Object} svdResult - SVD分解结果 {U, sigma, V_T}
     * @param {number} percent - 奇异值保留比例 (0-1)
     * @returns {number[][]} 重构的矩阵
     */
    static getCompressData(svdResult, percent) {
        const { U, sigma, V_T } = svdResult;
        const m = U.length;
        const n = V_T[0].length;

        // 初始化通道矩阵
        const channel = Array(m).fill().map(() => Array(n).fill(0));

        // 计算要保留的奇异值个数
        const retainCount = Math.max(1, Math.ceil(sigma.length * percent));

        // 按照原始逻辑进行重构
        for (let k = 0; k < retainCount && k < sigma.length; k++) {
            // 计算 sigma[k] * U[:, k] * V_T[k, :]
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < n; j++) {
                    channel[i][j] += sigma[k] * U[i][k] * V_T[k][j];
                }
            }
        }

        // 优化数据规范化：使用更平滑的量化方法
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                // 使用更平滑的量化，减少JPEG压缩时的伪影
                let value = channel[i][j];
                
                // 限制在0-255范围内
                if (value < 0) value = 0;
                if (value > 255) value = 255;
                
                // 使用更精确的量化，减少舍入误差
                channel[i][j] = Math.round(value);
            }
        }

        return channel;
    }

    /**
     * 根据奇异值之和占比重构矩阵
     * @param {Object} svdResult - SVD分解结果 {U, sigma, V_T}
     * @param {number} percent - 奇异值之和保留比例 (0-1)
     * @returns {Object} 包含重构矩阵和实际使用奇异值个数的对象
     */
    static getCompressSum(svdResult, percent) {
        const { U, sigma, V_T } = svdResult;
        const m = U.length;
        const n = V_T[0].length;

        // 初始化通道矩阵
        const channel = Array(m).fill().map(() => Array(n).fill(0));

        // 计算奇异值总和
        const totalSum = sigma.reduce((sum, sig) => sum + sig, 0);
        const targetSum = totalSum * percent;

        let currentSum = 0;
        let usedSingularValues = 0;

        // 按照原始逻辑进行重构
        for (let i = 0; i < sigma.length; i++) {
            currentSum += sigma[i];
            usedSingularValues++;

            // 计算 sigma[i] * U[:, i] * V_T[i, :]
            for (let row = 0; row < m; row++) {
                for (let col = 0; col < n; col++) {
                    channel[row][col] += sigma[i] * U[row][i] * V_T[i][col];
                }
            }

            // 若累计奇异值之和超过给定占比，则停止
            if (currentSum > targetSum) {
                break;
            }
        }

        // 优化数据规范化：使用更平滑的量化方法
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                // 使用更平滑的量化，减少JPEG压缩时的伪影
                let value = channel[i][j];
                
                // 限制在0-255范围内
                if (value < 0) value = 0;
                if (value > 255) value = 255;
                
                // 使用更精确的量化，减少舍入误差
                channel[i][j] = Math.round(value);
            }
        }

        return {
            matrix: channel,
            usedSingularValues: usedSingularValues
        };
    }
    
    /**
     * 矩阵转置
     */
    static transpose(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const result = Array(cols).fill().map(() => Array(rows).fill(0));
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                result[j][i] = matrix[i][j];
            }
        }
        
        return result;
    }
    
    /**
     * 矩阵乘法
     */
    static multiplyMatrices(A, B) {
        const rowsA = A.length;
        const colsA = A[0].length;
        const colsB = B[0].length;
        
        const result = Array(rowsA).fill().map(() => Array(colsB).fill(0));
        
        for (let i = 0; i < rowsA; i++) {
            for (let j = 0; j < colsB; j++) {
                for (let k = 0; k < colsA; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        
        return result;
    }
    
    /**
     * 矩阵向量乘法
     */
    static multiplyMatrixVector(matrix, vector) {
        const rows = matrix.length;
        const result = new Array(rows).fill(0);

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < vector.length; j++) {
                result[i] += matrix[i][j] * vector[j];
            }
        }

        return result;
    }
}

/**
 * 图像处理工具类 - 重构版本
 */
class ImageProcessor {
    /**
     * 检测图像类型（黑白或彩色）
     * @param {ImageData} imageData - 图像数据
     * @returns {string} 'grayscale' 或 'rgb'
     */
    static detectImageType(imageData) {
        const { data } = imageData;
        let totalPixels = 0;
        let grayscalePixels = 0;
        
        // 采样检测：为了提高性能，只检查部分像素
        const sampleStep = Math.max(1, Math.floor(data.length / 4 / 1000)); // 采样1000个像素
        
        for (let i = 0; i < data.length; i += 4 * sampleStep) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            totalPixels++;
            
            // 检查RGB值是否相等（允许小的误差）
            const tolerance = 5; // 允许5个像素值的误差
            if (Math.abs(r - g) <= tolerance && Math.abs(g - b) <= tolerance && Math.abs(r - b) <= tolerance) {
                grayscalePixels++;
            }
        }
        
        // 如果超过95%的像素都是灰度，则认为是灰度图像
        const grayscaleRatio = grayscalePixels / totalPixels;
        return grayscaleRatio >= 0.95 ? 'grayscale' : 'rgb';
    }

    /**
     * 将图像数据转换为矩阵
     * @param {ImageData} imageData - 图像数据
     * @returns {Object} 包含矩阵和图像类型信息的对象
     */
    static imageToMatrix(imageData) {
        const { data, width, height } = imageData;
        const imageType = this.detectImageType(imageData);
        
        if (imageType === 'grayscale') {
            // 黑白图像 - 只处理一个通道
            const matrix = Array(height).fill().map(() => Array(width).fill(0));
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    matrix[y][x] = data[idx]; // 使用红色通道作为灰度值
                }
            }
            
            return {
                type: 'grayscale',
                matrices: { gray: matrix },
                width,
                height
            };
        } else {
            // RGB图像 - 处理三个通道
        const matrices = {
            r: Array(height).fill().map(() => Array(width).fill(0)),
            g: Array(height).fill().map(() => Array(width).fill(0)),
            b: Array(height).fill().map(() => Array(width).fill(0))
        };

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                matrices.r[y][x] = data[idx];       // Red (0-255)
                matrices.g[y][x] = data[idx + 1];   // Green (0-255)
                matrices.b[y][x] = data[idx + 2];   // Blue (0-255)
            }
        }

            return {
                type: 'rgb',
                matrices,
                width,
                height
            };
        }
    }
    
    /**
     * 将矩阵转换回图像数据
     * @param {Object} matrixData - 矩阵数据对象
     * @returns {ImageData} 图像数据
     */
    static matrixToImage(matrixData) {
        const { type, matrices, width, height } = matrixData;
        const imageData = new ImageData(width, height);

        if (type === 'grayscale') {
            // 黑白图像
            const gray = matrices.gray;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    const value = Math.max(0, Math.min(255, Math.round(gray[y][x])));
                    imageData.data[idx] = value;     // Red
                    imageData.data[idx + 1] = value; // Green
                    imageData.data[idx + 2] = value; // Blue
                    imageData.data[idx + 3] = 255;   // Alpha
                }
            }
        } else {
            // RGB图像
        const { r, g, b } = matrices;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                imageData.data[idx] = Math.max(0, Math.min(255, Math.round(r[y][x])));     // Red
                imageData.data[idx + 1] = Math.max(0, Math.min(255, Math.round(g[y][x]))); // Green
                imageData.data[idx + 2] = Math.max(0, Math.min(255, Math.round(b[y][x]))); // Blue
                imageData.data[idx + 3] = 255; // Alpha
                }
            }
        }

        return imageData;
    }
    
    /**
     * 使用SVD压缩图像 - 重构版本
     * @param {ImageData} imageData - 图像数据
     * @param {number} compressionRatio - 压缩比例 (0-100)
     * @param {string} compressionMethod - 压缩方式 ('count' 或 'sum')
     * @param {function} progressCallback - 进度回调函数
     */
    static async compressImage(imageData, compressionRatio, compressionMethod = 'count', progressCallback = null) {
        const { width, height } = imageData;
        const m = height;
        const n = width;

        if (progressCallback) progressCallback(5, '分析图像类型...');

        // 转换图像数据为矩阵
        const matrixData = this.imageToMatrix(imageData);
        const { type, matrices } = matrixData;

        if (progressCallback) progressCallback(10, `检测到${type === 'grayscale' ? '黑白' : '彩色'}图像`);

        // 转换压缩比例为百分比 (0-1)
        const percent = compressionRatio / 100;

        // 根据图像类型进行不同的处理
        if (type === 'grayscale') {
            // 黑白图像处理
            if (progressCallback) progressCallback(15, '处理黑白图像...');

            // 添加延迟让UI更新
            await new Promise(resolve => setTimeout(resolve, 50));

            // 对灰度通道进行SVD分解
            const svdResult = SVD.decompose(matrices.gray, (progress) => {
                if (progressCallback) {
                    progressCallback(15 + progress * 0.3, 'SVD分解灰度通道...');
                }
            });

            // 根据压缩方式选择不同的压缩函数
            let compressedMatrix;
            let actualRetainedValues;
            if (compressionMethod === 'sum') {
                const compressedResult = SVD.getCompressSum(svdResult, percent);
                compressedMatrix = compressedResult.matrix;
                actualRetainedValues = compressedResult.usedSingularValues;
            } else {
                compressedMatrix = SVD.getCompressData(svdResult, percent);
                actualRetainedValues = Math.ceil(totalSingularValues * percent);
            }

            // 重构图像数据
            const compressedMatrixData = {
                type: 'grayscale',
                matrices: { gray: compressedMatrix },
                width,
                height
            };

            const compressedImageData = this.matrixToImage(compressedMatrixData);

            // 计算压缩统计信息
            const totalSingularValues = svdResult.sigma.length;
            const retainedSingularValues = actualRetainedValues;

            // 计算压缩比
            const k = retainedSingularValues;
            const dataCompressionRatio = (m * n) / (k * (m + n + 1));

            if (progressCallback) progressCallback(100, '压缩完成！');

            return {
                imageData: compressedImageData,
                retainedSingularValues,
                totalSingularValues,
                compressionRatio: dataCompressionRatio.toFixed(2),
                compressionMethod,
                imageType: type
            };

        } else {
            // RGB图像处理
            const channels = ['r', 'g', 'b'];
        const compressedMatrices = {};
        const svdResults = {};
            let totalRetainedValues = 0;
            let totalSingularValues = 0;

        for (let i = 0; i < channels.length; i++) {
            const channel = channels[i];

            if (progressCallback) {
                    progressCallback(20 + i * 20, `处理${channel.toUpperCase()}通道...`);
            }

            // 添加延迟让UI更新
            await new Promise(resolve => setTimeout(resolve, 50));

            // 进行SVD分解
                svdResults[channel] = SVD.decompose(matrices[channel], (progress) => {
                    if (progressCallback) {
                        progressCallback(20 + i * 20 + progress * 0.15, `SVD分解${channel.toUpperCase()}通道...`);
                    }
                });

            // 根据压缩方式选择不同的压缩函数
            if (compressionMethod === 'sum') {
                const compressedResult = SVD.getCompressSum(svdResults[channel], percent);
                compressedMatrices[channel] = compressedResult.matrix;
                totalRetainedValues += compressedResult.usedSingularValues;
            } else {
                compressedMatrices[channel] = SVD.getCompressData(svdResults[channel], percent);
                totalRetainedValues += Math.ceil(svdResults[channel].sigma.length * percent);
            }

                // 计算统计信息
            const { sigma } = svdResults[channel];
            totalSingularValues += sigma.length;
        }

            if (progressCallback) progressCallback(80, '重构RGB图像...');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 重构图像数据
            const compressedMatrixData = {
                type: 'rgb',
                matrices: compressedMatrices,
                width,
                height
            };

            const compressedImageData = this.matrixToImage(compressedMatrixData);

        const avgRetainedValues = Math.round(totalRetainedValues / 3);
        const avgTotalValues = Math.round(totalSingularValues / 3);

            // 计算压缩比
        const k = avgRetainedValues;
        const dataCompressionRatio = (m * n) / (k * (m + n + 1));

            if (progressCallback) progressCallback(100, '压缩完成！');

        return {
            imageData: compressedImageData,
            retainedSingularValues: avgRetainedValues,
            totalSingularValues: avgTotalValues,
            compressionRatio: dataCompressionRatio.toFixed(2),
                compressionMethod,
                imageType: type
        };
        }
    }

    /**
     * 计算两个图像之间的均方误差(MSE)
     * @param {ImageData} originalImageData - 原始图像数据
     * @param {ImageData} compressedImageData - 压缩图像数据
     * @returns {number} 均方误差值
     */
    static calculateMSE(originalImageData, compressedImageData) {
        const original = originalImageData.data;
        const compressed = compressedImageData.data;

        if (original.length !== compressed.length) {
            throw new Error('图像尺寸不匹配');
        }

        let sumSquaredDiff = 0;
        let pixelCount = 0;

        // 只计算RGB通道，跳过Alpha通道
        for (let i = 0; i < original.length; i += 4) {
            // Red channel
            const diffR = original[i] - compressed[i];
            sumSquaredDiff += diffR * diffR;

            // Green channel
            const diffG = original[i + 1] - compressed[i + 1];
            sumSquaredDiff += diffG * diffG;

            // Blue channel
            const diffB = original[i + 2] - compressed[i + 2];
            sumSquaredDiff += diffB * diffB;

            pixelCount += 3; // 3个颜色通道
        }

        return sumSquaredDiff / pixelCount;
    }
}
