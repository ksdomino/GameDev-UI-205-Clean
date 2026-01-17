/**
 * Collision - Utility functions for collision detection
 * 
 * Provides optimized collision checks for common shape combinations.
 * Essential for bullet/enemy hit detection in action games.
 * 
 * Usage:
 *   import { Collision } from './core/Collision.js';
 *   
 *   // Circle vs Circle (bullets, enemies)
 *   if (Collision.circleCircle(bullet, enemy)) { ... }
 *   
 *   // Circle vs Rectangle (bullet vs paddle/wall)
 *   if (Collision.circleRect(ball, paddle)) { ... }
 *   
 *   // Point vs Circle (click detection on circular objects)
 *   if (Collision.pointCircle(mouseX, mouseY, coin)) { ... }
 */
export const Collision = {
    /**
     * Circle vs Circle collision
     * Entities should have: x, y (center), radius
     * @param {Object} a - First circle
     * @param {Object} b - Second circle
     * @returns {boolean}
     */
    circleCircle(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSquared = dx * dx + dy * dy;
        const radiusSum = (a.radius || 0) + (b.radius || 0);
        return distSquared < radiusSum * radiusSum;
    },

    /**
     * Circle vs Rectangle collision (AABB)
     * Circle: has x, y (center), radius
     * Rect: has x, y (top-left), width, height
     * @param {Object} circle 
     * @param {Object} rect 
     * @returns {boolean}
     */
    circleRect(circle, rect) {
        // Find closest point on rectangle to circle center
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

        // Check if closest point is within circle
        const dx = circle.x - closestX;
        const dy = circle.y - closestY;
        const distSquared = dx * dx + dy * dy;
        const radius = circle.radius || 0;

        return distSquared < radius * radius;
    },

    /**
     * Rectangle vs Rectangle collision (AABB)
     * Entities should have: x, y (top-left), width, height
     * @param {Object} a 
     * @param {Object} b 
     * @returns {boolean}
     */
    rectRect(a, b) {
        return a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y;
    },

    /**
     * Point vs Circle collision
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {Object} circle - Circle with x, y (center), radius
     * @returns {boolean}
     */
    pointCircle(px, py, circle) {
        const dx = px - circle.x;
        const dy = py - circle.y;
        const distSquared = dx * dx + dy * dy;
        const radius = circle.radius || 0;
        return distSquared < radius * radius;
    },

    /**
     * Point vs Rectangle collision
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {Object} rect - Rectangle with x, y (top-left), width, height
     * @returns {boolean}
     */
    pointRect(px, py, rect) {
        return px >= rect.x && px < rect.x + rect.width &&
            py >= rect.y && py < rect.y + rect.height;
    },

    /**
     * Get distance between two points
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @returns {number}
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Get squared distance (faster, for comparisons)
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @returns {number}
     */
    distanceSquared(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    },

    /**
     * Check if entity is within screen bounds
     * @param {Object} entity - Entity with x, y
     * @param {number} margin - Extra margin outside screen
     * @returns {boolean}
     */
    isOnScreen(entity, margin = 0) {
        const x = entity.x;
        const y = entity.y;
        const w = entity.width || entity.radius * 2 || 0;
        const h = entity.height || entity.radius * 2 || 0;

        return x + w > -margin && x < 1080 + margin &&
            y + h > -margin && y < 1920 + margin;
    }
};
