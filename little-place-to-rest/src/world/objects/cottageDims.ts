// Cottage dimensions (local space: origin = floor centre, front door faces +Z).
// Kept in its own module so the cottage, its interior and the director can share it
// without circular-import ordering problems.
export const COTTAGE = {
  W: 2.4, // width (x)
  D: 2.6, // depth (z)
  H: 1.55, // wall height
  rise: 1.15, // roof rise above walls
  T: 0.1, // wall thickness
  door: { w: 0.62, h: 1.12 },
};
