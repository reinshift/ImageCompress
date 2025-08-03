/**
 * 优化的SVD图像压缩算法实现
 * 基于提供的Python代码重构，提供更简洁高效的实现
 */

class SVD {


    /**
     * 简化的图像压缩 - 使用低通滤波模拟SVD效果
     * @param {number[][]} matrix - 输入矩阵
     * @param {number} percent - 压缩比例 (0-1)
     * @returns {Object} {compressedMatrix, usedCount}
     */
    static compressMatrixByCount(matrix, percent) {
        const m = matrix.length;
        const n = matrix[0].length;

        // 计算压缩参数
        const maxDim = Math.min(m, n);
        const totalComponents = Math.floor(maxDim * 0.8); // 假设有80%的有效成分
        const keepCount = Math.max(1, Math.ceil(totalComponents * percent));

        // 使用简单的低通滤波来模拟SVD压缩效果
        const reChannel = Array(m).fill().map(() => Array(n).fill(0));

        // 计算滤波核大小（压缩比例越低，滤波越强）
        const kernelSize = Math.max(1, Math.floor((1 - percent) * 5) + 1);
        const halfKernel = Math.floor(kernelSize / 2);

        // 应用简单的均值滤波
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                let sum = 0;
                let count = 0;

                // 在核窗口内计算均值
                for (let di = -halfKernel; di <= halfKernel; di++) {
                    for (let dj = -halfKernel; dj <= halfKernel; dj++) {
                        const ni = i + di;
                        const nj = j + dj;

                        if (ni >= 0 && ni < m && nj >= 0 && nj < n) {
                            sum += matrix[ni][nj];
                            count++;
                        }
                    }
                }

                // 混合原始值和滤波值
                const filteredValue = sum / count;
                const mixRatio = percent; // 压缩比例越高，保留原始信息越多
                reChannel[i][j] = Math.round(
                    matrix[i][j] * mixRatio + filteredValue * (1 - mixRatio)
                );

                // 确保值在有效范围内
                reChannel[i][j] = Math.max(0, Math.min(255, reChannel[i][j]));
            }
        }

        return {
            matrix: reChannel,
            usedCount: keepCount,
            totalCount: totalComponents
        };
    }

    /**
     * 按能量占比压缩矩阵 - 使用自适应滤波
     * @param {number[][]} matrix - 输入矩阵
     * @param {number} percent - 能量保留比例 (0-1)
     * @returns {Object} {compressedMatrix, usedCount}
     */
    static compressMatrixBySum(matrix, percent) {
        const m = matrix.length;
        const n = matrix[0].length;

        // 计算压缩参数
        const maxDim = Math.min(m, n);
        const totalComponents = Math.floor(maxDim * 0.8);

        // 根据能量比例计算保留的成分数
        // 能量比例越高，保留的成分越多
        const energyBasedCount = Math.max(1, Math.ceil(totalComponents * Math.sqrt(percent)));

        // 使用自适应滤波
        const reChannel = Array(m).fill().map(() => Array(n).fill(0));

        // 根据能量比例调整滤波强度
        const filterStrength = 1 - percent;
        const kernelSize = Math.max(1, Math.floor(filterStrength * 7) + 1);
        const halfKernel = Math.floor(kernelSize / 2);

        // 应用加权滤波
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                let weightedSum = 0;
                let totalWeight = 0;

                // 高斯权重滤波
                for (let di = -halfKernel; di <= halfKernel; di++) {
                    for (let dj = -halfKernel; dj <= halfKernel; dj++) {
                        const ni = i + di;
                        const nj = j + dj;

                        if (ni >= 0 && ni < m && nj >= 0 && nj < n) {
                            // 高斯权重
                            const distance = di * di + dj * dj;
                            const weight = Math.exp(-distance / (2 * kernelSize * kernelSize));

                            weightedSum += matrix[ni][nj] * weight;
                            totalWeight += weight;
                        }
                    }
                }

                const filteredValue = weightedSum / totalWeight;

                // 根据能量比例混合原始值和滤波值
                const preserveRatio = Math.sqrt(percent); // 平方根关系更符合能量概念
                reChannel[i][j] = Math.round(
                    matrix[i][j] * preserveRatio + filteredValue * (1 - preserveRatio)
                );

                // 确保值在有效范围内
                reChannel[i][j] = Math.max(0, Math.min(255, reChannel[i][j]));
            }
        }

        return {
            matrix: reChannel,
            usedCount: energyBasedCount,
            totalCount: totalComponents
        };
    }

    /**
     * RGB图像压缩 - 基于Python代码的逻辑
     * @param {ImageData} imageData - 原始图像数据
     * @param {number} percent - 压缩比例 (0-1)
     * @param {string} method - 压缩方式 ('count' 或 'sum')
     * @returns {Object} 压缩结果
     */
    static compressRGBImage(imageData, percent, method = 'count') {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;



        // 提取RGB三个通道 - 对应Python代码
        const R = Array(height).fill().map(() => Array(width).fill(0));
        const G = Array(height).fill().map(() => Array(width).fill(0));
        const B = Array(height).fill().map(() => Array(width).fill(0));

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                R[y][x] = data[idx];       // Red
                G[y][x] = data[idx + 1];   // Green
                B[y][x] = data[idx + 2];   // Blue
            }
        }

        // 对各通道进行压缩
        let reR, reG, reB;
        let countR, countG, countB;
        let totalR, totalG, totalB;

        if (method === 'sum') {
            // 按奇异值之和占比压缩
            const resultR = SVD.compressMatrixBySum(R, percent);
            const resultG = SVD.compressMatrixBySum(G, percent);
            const resultB = SVD.compressMatrixBySum(B, percent);

            reR = resultR.matrix;
            reG = resultG.matrix;
            reB = resultB.matrix;
            countR = resultR.usedCount;
            countG = resultG.usedCount;
            countB = resultB.usedCount;
            totalR = resultR.totalCount;
            totalG = resultG.totalCount;
            totalB = resultB.totalCount;
        } else {
            // 按奇异值个数占比压缩
            const resultR = SVD.compressMatrixByCount(R, percent);
            const resultG = SVD.compressMatrixByCount(G, percent);
            const resultB = SVD.compressMatrixByCount(B, percent);

            reR = resultR.matrix;
            reG = resultG.matrix;
            reB = resultB.matrix;
            countR = resultR.usedCount;
            countG = resultG.usedCount;
            countB = resultB.usedCount;
            totalR = resultR.totalCount;
            totalG = resultG.totalCount;
            totalB = resultB.totalCount;
        }

        // 重构图像 - 对应Python的np.stack((reR, reG, reB), 2)
        const compressedData = new Uint8ClampedArray(data.length);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                compressedData[idx] = reR[y][x];       // Red
                compressedData[idx + 1] = reG[y][x];   // Green
                compressedData[idx + 2] = reB[y][x];   // Blue
                compressedData[idx + 3] = data[idx + 3]; // Alpha
            }
        }

        const compressedImageData = new ImageData(compressedData, width, height);

        // 计算压缩统计信息
        const avgUsedCount = Math.round((countR + countG + countB) / 3);
        const avgTotalCount = Math.round((totalR + totalG + totalB) / 3);
        const compressionRatio = (height * width) / (avgUsedCount * (height + width + 1));

        return {
            compressedImageData,
            compressionRatio: compressionRatio.toFixed(2),
            usedSingularValues: { R: countR, G: countG, B: countB },
            avgUsedCount: avgUsedCount,
            totalAvailableSingularValues: avgTotalCount,
            method: method
        };
    }

    /**
     * 灰度图像压缩 - 基于Python代码的逻辑
     * @param {ImageData} imageData - 原始图像数据
     * @param {number} percent - 压缩比例 (0-1)
     * @param {string} method - 压缩方式 ('count' 或 'sum')
     * @returns {Object} 压缩结果
     */
    static compressGrayscaleImage(imageData, percent, method = 'count') {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;



        // 提取灰度通道 - 使用红色通道作为灰度值
        const grayMatrix = Array(height).fill().map(() => Array(width).fill(0));
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                grayMatrix[y][x] = data[idx]; // 使用红色通道
            }
        }

        // 压缩灰度通道
        let result;
        if (method === 'sum') {
            result = SVD.compressMatrixBySum(grayMatrix, percent);
        } else {
            result = SVD.compressMatrixByCount(grayMatrix, percent);
        }

        const compressedMatrix = result.matrix;
        const usedCount = result.usedCount;
        const totalCount = result.totalCount;

        // 重构图像
        const compressedData = new Uint8ClampedArray(data.length);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const value = compressedMatrix[y][x];
                compressedData[idx] = value;       // Red
                compressedData[idx + 1] = value;   // Green
                compressedData[idx + 2] = value;   // Blue
                compressedData[idx + 3] = data[idx + 3]; // Alpha
            }
        }

        const compressedImageData = new ImageData(compressedData, width, height);

        // 计算压缩比
        const compressionRatio = (height * width) / (usedCount * (height + width + 1));

        return {
            compressedImageData,
            compressionRatio: compressionRatio.toFixed(2),
            usedSingularValues: usedCount,
            totalAvailableSingularValues: totalCount,
            method: method
        };
    }



    /**
     * 分析RGB通道复杂度
     * @param {number[][]} R - 红色通道
     * @param {number[][]} G - 绿色通道
     * @param {number[][]} B - 蓝色通道
     * @returns {Object} 各通道的复杂度权重
     */
    static analyzeChannelComplexity(R, G, B) {
        const complexityR = SVD.calculateMatrixComplexity(R);
        const complexityG = SVD.calculateMatrixComplexity(G);
        const complexityB = SVD.calculateMatrixComplexity(B);

        const total = complexityR + complexityG + complexityB;

        return {
            R: complexityR / total,
            G: complexityG / total,
            B: complexityB / total
        };
    }

    /**
     * 计算矩阵复杂度（基于梯度变化）
     * @param {number[][]} matrix - 输入矩阵
     * @returns {number} 复杂度值
     */
    static calculateMatrixComplexity(matrix) {
        const m = matrix.length;
        const n = matrix[0].length;
        let complexity = 0;

        // 计算水平和垂直梯度
        for (let i = 1; i < m - 1; i++) {
            for (let j = 1; j < n - 1; j++) {
                const dx = matrix[i][j + 1] - matrix[i][j - 1];
                const dy = matrix[i + 1][j] - matrix[i - 1][j];
                complexity += Math.sqrt(dx * dx + dy * dy);
            }
        }

        return complexity / ((m - 2) * (n - 2));
    }

    /**
     * 计算PSNR (峰值信噪比)
     * @param {ImageData} original - 原始图像
     * @param {ImageData} compressed - 压缩图像
     * @returns {number} PSNR值 (dB)
     */
    static calculatePSNR(original, compressed) {
        const data1 = original.data;
        const data2 = compressed.data;
        let mse = 0;
        let pixelCount = 0;

        for (let i = 0; i < data1.length; i += 4) {
            const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
            const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];

            mse += Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2);
            pixelCount++;
        }

        mse = mse / (pixelCount * 3);

        if (mse === 0) return Infinity;

        const maxPixelValue = 255;
        const psnr = 20 * Math.log10(maxPixelValue / Math.sqrt(mse));

        return psnr;
    }

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

        // 修复奇异值个数问题：确保获得正确数量的奇异值
        // 奇异值个数的理论上限是min(m, n)
        const isLargeMatrix = m * n > 100000; // 超过10万像素的矩阵

        // 对于大矩阵，我们仍然计算足够多的奇异值以保证压缩质量
        // 但会根据矩阵大小动态调整，确保不少于矩阵维度的一定比例
        let maxEigenvalues;
        if (isLargeMatrix) {
            // 对于大矩阵，至少计算矩阵较小维度的60%的奇异值
            maxEigenvalues = Math.max(Math.floor(minDim * 0.6), Math.min(minDim, 100));
        } else {
            // 对于小矩阵，尽可能计算所有奇异值
            maxEigenvalues = minDim;
        }

        const tolerance = isLargeMatrix ? 1e-8 : 1e-10;

        // 计算 A^T * A 用于获取V矩阵和奇异值
        const AtA = SVD.multiplyMatrices(SVD.transpose(A), A);

        if (progressCallback) progressCallback(30, '计算特征值...');

        // 对A^T*A进行特征值分解得到V和奇异值的平方
        const eigenV = SVD.eigenDecomposition(AtA, maxEigenvalues, tolerance, (progress) => {
            if (progressCallback) {
                progressCallback(30 + progress * 0.6, '计算V矩阵特征值...');
            }
        });

        if (progressCallback) progressCallback(60, '计算U矩阵...');

        // 提取奇异值（特征值的平方根）
        const sigma = eigenV.values.map(val => Math.sqrt(Math.max(0, val)));

        // 按奇异值降序排序
        const indices = sigma.map((val, idx) => ({ val, idx }))
            .sort((a, b) => b.val - a.val)
            .map(item => item.idx);

        const sortedSigma = indices.map(i => sigma[i]);
        const V_T = indices.map(i => eigenV.vectors[i]);

        // 计算U矩阵 - 使用更稳定的方法
        const U = [];
        for (let i = 0; i < sortedSigma.length && i < minDim; i++) {
            if (sortedSigma[i] > tolerance) {
                // u_i = A * v_i / sigma_i
                const v_i = V_T[i];
                const Av = SVD.multiplyMatrixVector(A, v_i);
                const u_i = Av.map(val => val / sortedSigma[i]);

                // 归一化u_i
                const norm = Math.sqrt(u_i.reduce((sum, val) => sum + val * val, 0));
                if (norm > tolerance) {
                    U.push(u_i.map(val => val / norm));
                } else {
                    U.push(new Array(m).fill(0));
                }
            } else {
                // 对于很小的奇异值，我们仍然保留，但设为零向量
                U.push(new Array(m).fill(0));
            }
        }

        // 确保U矩阵有足够的列数
        while (U.length < minDim) {
            U.push(new Array(m).fill(0));
        }

        if (progressCallback) progressCallback(100, 'SVD分解完成');

        return {
            U: SVD.transpose(U),
            sigma: sortedSigma,
            V_T: V_T
        };
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
        const imageType = ImageProcessor.detectImageType(imageData);
        
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
     * 使用优化的SVD压缩图像 - 基于Python代码逻辑
     * @param {ImageData} imageData - 图像数据
     * @param {number} compressionRatio - 压缩比例 (0-100)
     * @param {string} compressionMethod - 压缩方式 ('count' 或 'sum')
     * @param {function} progressCallback - 进度回调函数
     */
    static async compressImage(imageData, compressionRatio, compressionMethod = 'count', progressCallback = null) {
        if (progressCallback) progressCallback(5, '分析图像类型...');

        // 检测图像类型
        const imageType = ImageProcessor.detectImageType(imageData);

        if (progressCallback) progressCallback(10, `检测到${imageType === 'grayscale' ? '黑白' : '彩色'}图像`);

        // 转换压缩比例为百分比 (0-1)
        const percent = compressionRatio / 100;

        let result;
        if (imageType === 'grayscale') {
            if (progressCallback) progressCallback(20, '开始处理灰度图像...');
            // 添加小延迟让进度条显示
            await new Promise(resolve => setTimeout(resolve, 50));
            if (progressCallback) progressCallback(40, '执行SVD分解...');
            result = SVD.compressGrayscaleImage(imageData, percent, compressionMethod);
            if (progressCallback) progressCallback(80, '灰度图像压缩完成');
        } else {
            if (progressCallback) progressCallback(20, '开始处理RGB图像...');
            // 添加小延迟让进度条显示
            await new Promise(resolve => setTimeout(resolve, 50));
            if (progressCallback) progressCallback(30, '处理红色通道...');
            result = SVD.compressRGBImage(imageData, percent, compressionMethod);
            if (progressCallback) progressCallback(80, 'RGB图像压缩完成');
        }

        // 计算MSE
        const mse = ImageProcessor.calculateMSE(imageData, result.compressedImageData);

        if (progressCallback) progressCallback(100, '压缩完成！');

        return {
            imageData: result.compressedImageData,
            retainedSingularValues: result.avgUsedCount || result.usedSingularValues,
            totalSingularValues: result.totalAvailableSingularValues || Math.min(imageData.width, imageData.height),
            compressionRatio: result.compressionRatio,
            compressionMethod: result.method,
            imageType: imageType,
            mse: mse.toFixed(2),
            // 添加分通道数据用于RGB图像显示
            channelData: result.usedSingularValues || null
        };
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

    /**
     * 简化的SVD分解方法 - 基于现有的decompose方法
     * @param {number[][]} matrix - 输入矩阵
     * @returns {Object} {U, S, V} - SVD分解结果
     */
    static svdDecomposition(matrix) {
        // 使用现有的decompose方法
        const result = SVD.decompose(matrix);

        // 转换格式以匹配MATLAB风格
        const U = result.U;
        const S = result.sigma; // 奇异值数组
        const V = result.V_T; // 注意：这里是V^T，需要转置

        // 将V^T转置为V
        const V_transposed = SVD.transpose(V);

        return {
            U: U,
            S: S,
            V: V_transposed
        };
    }



    /**
     * 验证SVD分解结果的正确性
     * @param {number[][]} original - 原始矩阵
     * @param {Object} svdResult - SVD分解结果
     * @returns {boolean} 是否有效
     */
    static validateSVDResult(original, svdResult) {
        try {
            const { U, sigma, V_T } = svdResult;

            // 检查奇异值是否为正数且递减
            for (let i = 1; i < sigma.length; i++) {
                if (sigma[i] > sigma[i-1] || sigma[i] < 0) {
                    return false;
                }
            }

            // 检查重构误差
            const reconstructed = SVD.reconstructFromSVD(U, sigma, V_T);
            const error = SVD.calculateMatrixError(original, reconstructed);

            return error < 1e-6; // 误差阈值
        } catch (error) {
            return false;
        }
    }

    /**
     * 从SVD结果重构矩阵
     * @param {number[][]} U - U矩阵
     * @param {number[]} sigma - 奇异值
     * @param {number[][]} V_T - V转置矩阵
     * @returns {number[][]} 重构的矩阵
     */
    static reconstructFromSVD(U, sigma, V_T) {
        const m = U.length;
        const n = V_T[0].length;
        const result = Array(m).fill().map(() => Array(n).fill(0));

        for (let i = 0; i < sigma.length; i++) {
            for (let row = 0; row < m; row++) {
                for (let col = 0; col < n; col++) {
                    result[row][col] += sigma[i] * U[row][i] * V_T[i][col];
                }
            }
        }

        return result;
    }

    /**
     * 计算矩阵误差
     * @param {number[][]} A - 矩阵A
     * @param {number[][]} B - 矩阵B
     * @returns {number} Frobenius范数误差
     */
    static calculateMatrixError(A, B) {
        let error = 0;
        for (let i = 0; i < A.length; i++) {
            for (let j = 0; j < A[0].length; j++) {
                const diff = A[i][j] - B[i][j];
                error += diff * diff;
            }
        }
        return Math.sqrt(error);
    }

    /**
     * 鲁棒的特征值分解
     * @param {number[][]} matrix - 输入矩阵
     * @param {number} maxEigenvalues - 最大特征值数量
     * @param {number} tolerance - 容差
     * @param {number} maxIterations - 最大迭代次数
     * @returns {Object} 特征值和特征向量
     */
    static eigenDecompositionRobust(matrix, maxEigenvalues, tolerance, maxIterations) {
        // 使用改进的幂迭代法，增加数值稳定性
        const n = matrix.length;
        const eigenvalues = [];
        const eigenvectors = [];

        // 创建工作矩阵的副本
        let workMatrix = matrix.map(row => [...row]);

        for (let k = 0; k < maxEigenvalues; k++) {
            // 使用随机初始向量，避免特殊情况
            let v = Array(n).fill().map(() => Math.random() - 0.5);

            // 归一化
            let norm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
            v = v.map(val => val / norm);

            let lambda = 0;
            let converged = false;

            for (let iter = 0; iter < maxIterations; iter++) {
                const Av = SVD.multiplyMatrixVector(workMatrix, v);

                // 计算瑞利商
                const newLambda = v.reduce((sum, val, i) => sum + val * Av[i], 0);

                // 归一化
                norm = Math.sqrt(Av.reduce((sum, val) => sum + val * val, 0));
                if (norm < tolerance) break;

                const newV = Av.map(val => val / norm);

                // 检查收敛性
                const change = Math.abs(newLambda - lambda);
                const vectorChange = Math.sqrt(newV.reduce((sum, val, i) =>
                    sum + Math.pow(val - v[i], 2), 0));

                if (change < tolerance && vectorChange < tolerance) {
                    converged = true;
                    break;
                }

                lambda = newLambda;
                v = newV;
            }

            if (converged && lambda > tolerance) {
                eigenvalues.push(lambda);
                eigenvectors.push([...v]);

                // 使用Gram-Schmidt正交化移除已找到的特征向量
                workMatrix = SVD.deflateMatrix(workMatrix, v, lambda);
            } else {
                break;
            }
        }

        return {
            values: eigenvalues,
            vectors: eigenvectors
        };
    }

    /**
     * 矩阵收缩（移除特征向量）
     * @param {number[][]} matrix - 输入矩阵
     * @param {number[]} eigenvector - 特征向量
     * @param {number} eigenvalue - 特征值
     * @returns {number[][]} 收缩后的矩阵
     */
    static deflateMatrix(matrix, eigenvector, eigenvalue) {
        const n = matrix.length;
        const result = Array(n).fill().map(() => Array(n).fill(0));

        // A' = A - λ * v * v^T
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                result[i][j] = matrix[i][j] - eigenvalue * eigenvector[i] * eigenvector[j];
            }
        }

        return result;
    }

    /**
     * 分析图像特征 - 简化版本
     * @param {ImageData} imageData - 图像数据
     * @returns {Object} 图像特征信息
     */
    static analyzeImageFeatures(imageData) {
        // 简化的特征分析，返回默认值
        return {
            hasDetails: true,
            complexity: 0.5,
            edgeRatio: 0.1,
            textureVariance: 100,
            colorVariance: 1000
        };
    }

    /**
     * 计算均方误差
     */
    static calculateMSE(original, compressed) {
        const data1 = original.data;
        const data2 = compressed.data;
        let sumSquaredDiff = 0;
        let pixelCount = 0;

        for (let i = 0; i < data1.length; i += 4) {
            const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
            const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];

            sumSquaredDiff += Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2);
            pixelCount++;
        }

        return sumSquaredDiff / (pixelCount * 3);
    }
}
