from ml.predict import predict_threat


def analyze_network_threat(
    network_features: dict
) -> dict:
    """
    Analyze network traffic using the trained
    NSL-KDD threat detection model.

    Returns:
        {
            "label": "normal" or "attack",
            "threat_probability": float,
            "threshold": float
        }
    """

    if not isinstance(network_features, dict):
        raise TypeError(
            "network_features must be a dictionary."
        )

    return predict_threat(
        network_features
    )