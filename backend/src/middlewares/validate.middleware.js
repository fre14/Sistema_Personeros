export const validate = (schema) => (req, res, next) => {
  try {
    if (schema.shape && (schema.shape.body || schema.shape.query || schema.shape.params)) {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
    } else {
      const parsed = schema.parse(req.body);
      req.body = parsed;
    }
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: error.errors
    });
  }
};
