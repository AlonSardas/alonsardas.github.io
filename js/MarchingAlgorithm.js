import * as THREE from 'three';

export const MarchingAlgorithm = {
    dots: [],
    alphas: [], // 2D array of alpha sector angles
    betas: [],  // 2D array of beta sector angles
    rows: 0,
    cols: 0,

    init(rows, cols, horizontalVertices, verticalVertices) {
        this.rows = rows;
        this.cols = cols;
        // Initialize 2D arrays with null or 0
        this.dots = Array.from({ length: rows }, () => Array(cols).fill(null));
        this.alphas = Array.from({ length: rows }, () => Array(cols).fill(0));
        this.betas = Array.from({ length: rows }, () => Array(cols).fill(0));

        for (let j = 0; j < cols; j++) this.dots[0][j] = horizontalVertices[j].pos;
        for (let i = 0; i < rows - 1; i++) this.dots[i + 1][0] = verticalVertices[i].pos;
        this.setAnglesFromBoundary(horizontalVertices, verticalVertices);
    },
    setAnglesFromBoundary(horizontalVertices, verticalVertices) {
        const fixMod = (angle) => {
            const TWO_PI = Math.PI * 2;
            return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
        };

        // Set 0,0
        const v = horizontalVertices[0].pos;
        const vRight = horizontalVertices[1].pos;
        const vUp = verticalVertices[0].pos;
        this.alphas[0][0] = Math.atan2(vUp.y - v.y, vUp.x - v.x) - Math.atan2(vRight.y - v.y, vRight.x - v.x);
        this.betas[0][0] = horizontalVertices[0].alpha - Math.atan2(vUp.y - v.y, vUp.x - v.x);

        if (this.betas[0][0] < 0) {
            throw new IncompatibleError(`Incompatible angles at corner (0,0): beta is negative (${this.betas[0][0]})`);
        }

        console.log(`Corner alpha: ${this.alphas[0][0]}, beta: ${this.betas[0][0]}`);

        for (let j = 1; j < this.cols; j++) {
            const v = horizontalVertices[j];
            const rayAngle = v.alpha;

            const p1 = v.pos;
            const p2 = horizontalVertices[j - 1].pos;
            const angleLeft = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            this.betas[0][j] = fixMod(angleLeft) - rayAngle;

            let angleRight = 0;
            if (j < this.cols - 1) {
                const p1 = v.pos;
                const p2 = horizontalVertices[j + 1].pos;
                angleRight = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                this.alphas[0][j] = rayAngle - angleRight;
            } else {
                this.alphas[0][j] = this.betas[0][j];
            }

            // console.log(`H[${j}] alpha: ${this.alphas[0][j]}, beta: ${this.betas[0][j]}`);
        }

        for (let i = 1; i < this.rows; i++) {
            const v = verticalVertices[i - 1];
            const rayAngle = v.alpha;

            const p1 = v.pos;
            const p2 = (i === 1) ? this.dots[0][0] : verticalVertices[i - 2].pos;
            const angleDown = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            this.betas[i][0] = Math.PI - (rayAngle - angleDown);

            if (i < this.rows - 1) {
                const p1 = v.pos;
                const p2 = verticalVertices[i].pos;
                const angleUp = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                this.alphas[i][0] = angleUp - rayAngle;
            } else {
                this.alphas[i][0] = this.betas[i][0];
            }

            // console.log(`V[${i}] alpha: ${this.alphas[i][0]}, beta: ${this.betas[i][0]}`);
        }

        // console.log("final betas:", this.betas[this.rows - 1][0]);
    },

    calcNextAngle(i, j) {
        // 1. Retrieve neighbor angles
        const alpha_a = this.alphas[i - 1][j - 1];
        const beta_a = this.betas[i - 1][j - 1];

        const alpha_c = this.betas[i - 1][j];
        const beta_c = this.alphas[i - 1][j];

        const alpha_b = Math.PI - this.betas[i][j - 1];
        const beta_b = Math.PI - this.alphas[i][j - 1];

        const angles_sum = alpha_a + alpha_b + alpha_c;

        const alpha_d = 2 * Math.PI - angles_sum;
        if (alpha_d < 0) {
            throw new IncompatibleError(`Negative angle at ${i},${j}: ${alpha_d}`);
        }
        if (alpha_d > Math.PI) {
            throw new IncompatibleError(`Angle beyond PI at ${i},${j}: ${alpha_d}`);
        }

        let sigma_a, sigma_b, sigma_c;
        sigma_a = sigma_b = sigma_c = -1;
        // 3. Mu Calculations (using your paper's mu1/mu2 functions)
        // Note: Assuming mu1 and mu2 are defined globally or in RFFQM
        const mu_a = this.mu1(alpha_a, beta_a, -sigma_a);
        const mu_b = this.mu2(alpha_b, beta_b, sigma_b);
        const mu_c = this.mu2(alpha_c, beta_c, sigma_c);

        const mu_abc = mu_a * mu_b * mu_c;

        // 4. Second Check (|mu| is close to 1)
        if (Math.abs(Math.abs(mu_abc) - 1) < 1e-7) {
            throw new IncompatibleError(`|mu| close to 1 at ${i},${j}: ${mu_abc}`);
        }

        // 5. Calculate beta_d
        // const sigma_d = -Math.sign(Math.pow(mu_abc, 2) - 1);
        // console.log(`sigma_d at [${i}, ${j}]: ${sigma_d}`);
        const sigma_d = -1;
        const cos_sum = Math.cos(angles_sum);
        const mu_sq_plus_1 = Math.pow(mu_abc, 2) + 1;

        const numerator = sigma_d * (2 * mu_abc - mu_sq_plus_1 * cos_sum);
        const denominator = (2 * mu_abc * cos_sum - mu_sq_plus_1);

        const beta_d = Math.acos(numerator / denominator);

        // 6. Store results
        this.alphas[i][j] = Math.PI - alpha_d;
        this.betas[i][j] = Math.PI - beta_d;
        // console.log(`Angles At [${i}, ${j}] alpha: ${this.alphas[i][j]}, beta: ${this.betas[i][j]}`);
    },

    mu1(a, b, s) {
        return this.mu2(a, Math.PI - b, s);
    },

    mu2(a, b, s) {
        const num = -s + Math.cos(a) * Math.cos(b) + Math.sin(a) * Math.sin(b);
        const denom = Math.cos(b) - s * Math.cos(a);
        if (Math.abs(denom) < 1e-12) {
            throw new IncompatibleError(
                `Singular Mu calculation: Denominator is too close to zero (${denom}). ` +
                `Check if alpha (${a.toFixed(4)}) and beta (${b.toFixed(4)}) are valid.`
            );
        }
        return num / denom;
    },

    calcNextVertex(i, j) {
        const p_A = this.dots[i - 1][j - 1];
        const p_B = this.dots[i][j - 1];
        const p_C = this.dots[i - 1][j];

        // l_ac and l_ab from Python
        const l_ac = p_A.distanceTo(p_C);
        const l_ab = p_A.distanceTo(p_B);
        // console.log("P_a:", p_A, "P_b:", p_B, "P_c:", p_C);
        // console.log(`Lengths l_ac: ${l_ac}, l_ab: ${l_ab}`);

        // alpha_a: angle at (i-1, j-1)
        // alpha_b: angle at (i, j-1) -> pi - beta
        // alpha_c: angle at (i-1, j) -> beta
        const alpha_a = this.alphas[i - 1][j - 1];
        const alpha_b = Math.PI - this.betas[i][j - 1];
        const alpha_c = this.betas[i - 1][j];
        // console.log(`Calculating D at [${i}, ${j}] with alphas: ${alpha_a}, ${alpha_b}, ${alpha_c}`);
        const angles_sum = alpha_a + alpha_b + alpha_c;
        const det = Math.sin(angles_sum);

        if (Math.abs(det) < 1e-6) throw new IncompatibleError("Singular geometry: sin(sum) is zero");

        const l_cd = (1 / det) * (-Math.sin(alpha_b) * l_ab + Math.sin(alpha_a + alpha_b) * l_ac);
        const l_bd = (1 / det) * (Math.sin(alpha_a + alpha_c) * l_ab - Math.sin(alpha_c) * l_ac);

        // console.log(`Lengths l_cd: ${l_cd}, l_bd: ${l_bd}`);

        if (l_cd <= 0 || l_bd <= 0) {
            throw new IncompatibleError(`Non-positive crease length at ${i},${j}`);
        }

        const vec_ca = new THREE.Vector3().subVectors(p_A, p_C).normalize();

        // Rotate vec_ca by -alpha_c to get direction of vec_cd
        const angle = -alpha_c;
        const vec_cd = new THREE.Vector3(
            vec_ca.x * Math.cos(angle) - vec_ca.y * Math.sin(angle),
            vec_ca.x * Math.sin(angle) + vec_ca.y * Math.cos(angle),
            0
        );

        // New point D = C + vec_cd * l_cd
        const p_D = new THREE.Vector3().addVectors(p_C, vec_cd.multiplyScalar(l_cd));
        this.dots[i][j] = p_D;

        return p_D;
    }
};

export class IncompatibleError extends Error {
    constructor(message) {
        super(message);
        this.name = "IncompatibleError";
    }
}