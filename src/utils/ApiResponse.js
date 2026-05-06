class ApiResponse {
  static success(res, data = null, message = 'OK', status = 200) {
    return res.status(status).json({ success: true, message, data });
  }

  static created(res, data = null, message = 'Created') {
    return this.success(res, data, message, 201);
  }

  static error(res, message = 'Error', status = 500, errors = null) {
    return res.status(status).json({ success: false, message, errors });
  }
}

module.exports = ApiResponse;
