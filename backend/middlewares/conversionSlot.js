let conversionIsRunning = false;

export function conversionSlot(req, res, next) {
  if (conversionIsRunning) {
    return res.status(503).json({
      message: "A conversion is already running. Please try again shortly.",
    });
  }

  conversionIsRunning = true;
  let released = false;

  const releaseSlot = () => {
    if (released) return;
    released = true;
    conversionIsRunning = false;
  };

  res.once("finish", releaseSlot);
  res.once("close", releaseSlot);

  next();
}
