import * as THREE from 'three';

export class RFFQM {
    constructor(dots, sigmas = null) {
        this.rows = dots.length;
        this.cols = dots[0].length;

        // initial_dots stores the flat state (never changes)
        this.initialDots = dots.map(row => row.map(v => v.clone()));
        // dots stores the current folded state
        this.dots = dots.map(row => row.map(v => v.clone()));

        this.gamma = 0;

        // Initialize sigmas (default to -1 for Miura-Ori)
        if (!sigmas) {
            this.sigmas = Array(this.rows).fill().map(() => Array(this.cols).fill(-1));
        } else {
            this.sigmas = sigmas;
        }

        this.internalAngles = this._calcInternalAngles();
    }

    _calcInternalAngles() {
        // Equivalent to your Python _calc_angles
        // Stores [alpha, beta] for every internal vertex
        const angles = Array(this.rows).fill().map(() => Array(this.cols).fill(null));

        for (let i = 1; i < this.rows - 1; i++) {
            for (let j = 1; j < this.cols - 1; j++) {
                const x0 = this.initialDots[i][j];
                const t1 = new THREE.Vector3().subVectors(this.initialDots[i][j + 1], x0);
                const t2 = new THREE.Vector3().subVectors(this.initialDots[i + 1][j], x0);
                const t3 = new THREE.Vector3().subVectors(this.initialDots[i][j - 1], x0);

                angles[i][j] = {
                    alpha: t1.angleTo(t2),
                    beta: t2.angleTo(t3)
                };
            }
        }
        return angles;
    }

    setGamma(gamma, shouldCenter = true) {
        this.gamma = gamma;

        // 1. Reset dots to initial flat configuration for every call
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.dots[i][j].copy(this.initialDots[i][j]);
            }
        }

        let i = 1;
        let j = 1;

        // Initial calculation for the first vertex
        let { alpha, beta } = this.internalAngles[i][j];
        let [g1, g2, g3, g4] = this._calcAnglesRight(alpha, beta, this.sigmas[i][j], gamma);

        // This is used as the seed for the angles for the next rows
        let initial_gamma2 = g2;
        let current_gamma1 = gamma;

        console.log(`Setting gamma to ${gamma}`);

        // --- 2. Fold the first (bottom) row ---
        i = 1;
        for (j = 1; j < this.cols - 1; j++) {
            let angles = this.internalAngles[i][j];
            [current_gamma1, g2, g3, g4] = this._calcAnglesRight(
                angles.alpha,
                angles.beta,
                this.sigmas[i][j],
                current_gamma1
            );

            // dots_indices = indexes[:2, :j].flat
            this._rotateCrease(i, j, 4, g4, (r, c) => r < 2 && c < j);
        }

        current_gamma1 = gamma;

        // --- 3. Fold the remaining grid row by row ---
        for (i = 1; i < this.rows - 1; i++) {
            for (j = 1; j < this.cols - 1; j++) {
                let angles = this.internalAngles[i][j];
                [current_gamma1, g2, g3, g4] = this._calcAnglesRight(
                    angles.alpha,
                    angles.beta,
                    this.sigmas[i][j],
                    current_gamma1
                );

                // dots_indices = indexes[i + 1, :j].flat
                this._rotateCrease(i, j, 2, -g2, (r, c) => r === (i + 1) && c < j);
            }

            j = this.cols - 2;
            // dots_indices = indexes[:i + 1, :].flat
            this._rotateCrease(i, j, 1, current_gamma1, (r, c) => r <= i);

            if (i === this.rows - 2) break; // Finished

            // See eq. 76 for the angles one step up
            j = 1;
            let upAngles = this.internalAngles[i + 1][j];
            [current_gamma1, g2, g3, g4] = this._calcAnglesUp(
                upAngles.alpha,
                upAngles.beta,
                this.sigmas[i + 1][j],
                initial_gamma2
            );

            initial_gamma2 = g2;   // Save the seed of a vertical crease to the next row
            current_gamma1 = g3;   // This is the seed angle for the next row
        }

        // if (shouldCenter) {
        //     this.centerPattern();
        // }

        return this.dots;
    }

    _rotateCrease(i0, j0, direction, angle, conditionFn) {
        let i1 = i0, j1 = j0;
        if (direction === 1) j1++;
        else if (direction === 2) i1++;
        else if (direction === 3) j1--;
        else if (direction === 4) i1--;

        const x0 = this.initialDots[i0][j0];
        const p1 = this.initialDots[i1][j1];
        const axis = new THREE.Vector3().subVectors(p1, x0).normalize();

        // Apply rotation to all dots that satisfy conditionFn
        const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (conditionFn(r, c)) {
                    const v = this.dots[r][c];
                    v.sub(x0).applyQuaternion(quaternion).add(x0);
                }
            }
        }
    }

    _calcAnglesRight(alpha, beta, sigma, gamma1_in) {
        const gamma3 = gamma1_in;
        const gamma1 = -sigma * gamma3;
        const gamma2 = calc_gamma2(sigma, gamma1, alpha, beta);
        const gamma4 = sigma * gamma2;
        return [gamma1, gamma2, gamma3, gamma4];
    }

    _calcAnglesUp(alpha, beta, sigma, gamma2) {
        const g4 = gamma2;
        const g2 = sigma * g4;
        const g1 = calc_gamma1(sigma, g2, alpha, beta);
        const g3 = -sigma * g1;
        return [g1, g2, g3, g4];
    }
}

// Utility functions (Equation 10 and 11)
export function calc_gamma2(sigma, omega, alpha, beta) {
    const s = sigma;
    const o = omega;
    const a = alpha;
    const b = beta;

    const nom = (-s + Math.cos(a) * Math.cos(b)) * Math.cos(o) + Math.sin(a) * Math.sin(b);
    const deno = -s + Math.cos(a) * Math.cos(b) + Math.sin(a) * Math.sin(b) * Math.cos(o);

    const sgn = Math.sign((s * Math.cos(b) - Math.cos(a)) * o);
    return sgn * Math.acos(Math.max(-1, Math.min(1, nom / deno))); // Clamp for safety
}

export function calc_gamma1(sigma, omega, alpha, beta) {
    return calc_gamma2(-sigma, omega, alpha, Math.PI - beta);
}
