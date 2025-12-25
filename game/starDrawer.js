
function drawStarfield(ctx, width, height, starLayers, camX, camY, systemSize) {
    ctx.save();
    ctx.fillStyle = "#020309";
    ctx.fillRect(0, 0, width, height);

    starLayers.forEach((layer, idx) => {
        const factor = layer.factor;
        const stars = layer.stars;
        const size = 2 + idx;

        for (let s = 0; s < stars.length; s++) {
        const star = stars[s];

        const sx = (star.x - camX * factor) % (systemSize * 2);
        const sy = (star.y - camY * factor) % (systemSize * 2);

        let x = sx;
        let y = sy;

        if (x < -systemSize) x += systemSize * 2;
        if (y < -systemSize) y += systemSize * 2;

        const screenX = width / 2 + x * 0.1;
        const screenY = height / 2 + y * 0.1;

        if (
            screenX < -20 || screenX > width + 20 ||
            screenY < -20 || screenY > height + 20
        ) continue;

        const alpha = 0.3 + factor * 0.5;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        }
    });

    ctx.restore();
}