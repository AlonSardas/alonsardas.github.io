// ============================================
// STATE MANAGEMENT
// ============================================
export const AppState = {
    mode: 'design', // 'design', 'building' or 'folding'
    horizontalVertices: [], // List of { pos: Vector3, alpha: num }
    verticalVertices: [],   // List of { pos: Vector3, alpha: num }
    activationAngle: 0,
    rffqmData: null
};