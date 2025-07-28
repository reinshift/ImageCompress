/**
 * SVD (奇异值分解) 算法实现
 * 用于图像压缩 - 基于真实SVD算法
 */

class SVD {
    /**
     * 使用Jacobi方法进行SVD分解
     * @param {number[][]} matrix - 输入矩阵
     * @returns {Object} 包含U, sigma, V_T的对象
     */
    static decompose(matrix) {
        const A = matrix.map(row => [...row]); // 复制矩阵
        const m = A.length;
        const n = A[0].length;

        // 计算 A^T * A
        const AtA = this.multiplyMatrices(this.transpose(A), A);

        // 计算 A * A^T
        const AAt = this.multiplyMatrices(A, this.transpose(A));

        // 对A^T*A进行特征值分解得到V和奇异值的平方
        const eigenV = this.eigenDecomposition(AtA);
        const eigenU = this.eigenDecomposition(AAt);

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
            if (sortedSigma[i] > 1e-10) {
                // u_i = A * v_i / sigma_i
                const v_i = V_T[i];
                const Av = this.multiplyMatrixVector(A, v_i);
                const u_i = Av.map(val => val / sortedSigma[i]);
                U.push(u_i);
            } else {
                U.push(new Array(m).fill(0));
            }
        }

        return {
            U: this.transpose(U),
            sigma: sortedSigma,
            V_T: V_T
        };
    }
    
    /**
     * 根据奇异值占比重构矩阵 (基于Python代码逻辑)
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

        // 按照Python代码逻辑进行重构
        for (let k = 0; k < sigma.length; k++) {
            // 计算 sigma[k] * U[:, k] * V_T[k, :]
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < n; j++) {
                    channel[i][j] += sigma[k] * U[i][k] * V_T[k][j];
                }
            }

            // 检查是否达到指定的奇异值占比
            if ((k + 1) / sigma.length > percent) {
                // 规范化数据：限制在0-255范围内
                for (let i = 0; i < m; i++) {
                    for (let j = 0; j < n; j++) {
                        if (channel[i][j] < 0) channel[i][j] = 0;
                        if (channel[i][j] > 255) channel[i][j] = 255;
                        // 四舍五入到整数
                        channel[i][j] = Math.round(channel[i][j]);
                    }
                }
                break;
            }
        }

        return channel;
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

    /**
     * 特征值分解 (使用幂迭代法)
     */
    static eigenDecomposition(matrix) {
        const n = matrix.length;
        const maxIterations = 100;
        const tolerance = 1e-10;

        const eigenValues = [];
        const eigenVectors = [];

        // 复制矩阵
        let A = matrix.map(row => [...row]);

        for (let k = 0; k < Math.min(n, 20); k++) {
            // 幂迭代法求主特征值和特征向量
            let v = new Array(n);
            // 随机初始化
            for (let i = 0; i < n; i++) {
                v[i] = Math.random() - 0.5;
            }

            let lambda = 0;

            for (let iter = 0; iter < maxIterations; iter++) {
                const Av = this.multiplyMatrixVector(A, v);

                // 归一化
                const norm = Math.sqrt(Av.reduce((sum, val) => sum + val * val, 0));
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
                    break;
                }
                lambda = newLambda;
            }

            if (Math.abs(lambda) < tolerance) {
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
    

}

/**
 * 图像处理工具类
 */
class ImageProcessor {
    /**
     * 将图像数据转换为矩阵 (0-255范围)
     */
    static imageToMatrix(imageData) {
        const { data, width, height } = imageData;
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

        return matrices;
    }
    
    /**
     * 将矩阵转换回图像数据
     */
    static matrixToImage(matrices, width, height) {
        const imageData = new ImageData(width, height);
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

        return imageData;
    }
    
    /**
     * 使用SVD压缩图像 (基于Python代码逻辑)
     */
    static async compressImage(imageData, compressionRatio, progressCallback = null) {
        const matrices = this.imageToMatrix(imageData);
        const { width, height } = imageData;

        // 转换压缩比例为百分比 (0-1)
        const percent = compressionRatio / 100;

        if (progressCallback) progressCallback(10, '正在分析图像...');

        // 对每个颜色通道进行SVD压缩
        const compressedMatrices = {};
        const svdResults = {};
        const channels = ['r', 'g', 'b'];

        for (let i = 0; i < channels.length; i++) {
            const channel = channels[i];

            if (progressCallback) {
                progressCallback(20 + i * 20, `正在处理${channel.toUpperCase()}通道...`);
            }

            // 添加延迟让UI更新
            await new Promise(resolve => setTimeout(resolve, 50));

            // 进行SVD分解
            svdResults[channel] = SVD.decompose(matrices[channel]);

            // 使用指定比例进行压缩重构
            compressedMatrices[channel] = SVD.getCompressData(svdResults[channel], percent);
        }

        if (progressCallback) progressCallback(80, '正在重构图像...');
        await new Promise(resolve => setTimeout(resolve, 100));

        const compressedImageData = this.matrixToImage(compressedMatrices, width, height);

        if (progressCallback) progressCallback(100, '压缩完成！');

        // 计算实际使用的奇异值个数
        const avgSigmaLength = Object.values(svdResults).reduce((sum, result) => sum + result.sigma.length, 0) / 3;
        const retainedValues = Math.floor(avgSigmaLength * percent);

        return {
            imageData: compressedImageData,
            retainedSingularValues: retainedValues,
            totalSingularValues: Math.floor(avgSigmaLength),
            compressionRatio: (percent * 100).toFixed(1)
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
}
