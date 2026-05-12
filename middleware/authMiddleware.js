// middleware/authMiddleware.js

/**
 * Builds a unified user object from whichever session is active.
 *   Admin     → req.session.user      → role: "admin"
 *   Developer → req.session.developer → role: "developer"
 */
function getSessionUser(req) {
  if (req.session.user) {
    return { ...req.session.user, role: "admin" };
  }
  if (req.session.developer) {
    return { ...req.session.developer, role: "developer", developerId: req.session.developer._id };
  }
  return null;
}

export function requireAuth(req, res, next) {
  const user = getSessionUser(req);
  if (!user) return res.redirect("/auth/login");

  res.locals.user = user;   // available as `user` in every EJS template
  req.currentUser = user;   // available in route handlers via req.currentUser
  next();
}

export function requireAdmin(req, res, next) {
  const user = getSessionUser(req);
  if (!user) return res.redirect("/auth/login");

  if (user.role !== "admin") {
    return res.status(403).send("Access denied. Admins only.");
  }

  res.locals.user = user;
  req.currentUser = user;
  next();
}