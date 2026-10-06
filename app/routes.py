"""Blueprint API utama untuk web app publik."""

from flask import Blueprint, jsonify

api_bp = Blueprint("api_bp", __name__)


@api_bp.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "app": "web-public",
        "mode": "web-form",
    })
