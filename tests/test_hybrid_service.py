from backend.services.hybrid_service import analyze_security


def main():

    network_features = {
        "duration": 0,
        "protocol_type": "tcp",
        "service": "http",
        "flag": "SF",
        "src_bytes": 181,
        "dst_bytes": 5450,
        "land": 0,
        "wrong_fragment": 0,
        "urgent": 0,
        "hot": 0,
        "num_failed_logins": 0,
        "logged_in": 1,
        "num_compromised": 0,
        "root_shell": 0,
        "su_attempted": 0,
        "num_root": 0,
        "num_file_creations": 0,
        "num_shells": 0,
        "num_access_files": 0,
        "num_outbound_cmds": 0,
        "is_host_login": 0,
        "is_guest_login": 0,
        "count": 1,
        "srv_count": 1,
        "serror_rate": 0,
        "srv_serror_rate": 0,
        "rerror_rate": 0,
        "srv_rerror_rate": 0,
        "same_srv_rate": 1,
        "diff_srv_rate": 0,
        "srv_diff_host_rate": 0,
        "dst_host_count": 1,
        "dst_host_srv_count": 1,
        "dst_host_same_srv_rate": 1,
        "dst_host_diff_srv_rate": 0,
        "dst_host_same_src_port_rate": 1,
        "dst_host_srv_diff_host_rate": 0,
        "dst_host_serror_rate": 0,
        "dst_host_srv_serror_rate": 0,
        "dst_host_rerror_rate": 0,
        "dst_host_srv_rerror_rate": 0,
    }

    scenarios = [
        {
            "name": "NORMAL",
            "noise_rate": 0.0,
            "eve_probability": 0.0,
        },
        {
            "name": "NOISY CHANNEL",
            "noise_rate": 0.05,
            "eve_probability": 0.0,
        },
        {
            "name": "EAVESDROPPER",
            "noise_rate": 0.0,
            "eve_probability": 0.50,
        },
        {
            "name": "NOISE + EVE",
            "noise_rate": 0.05,
            "eve_probability": 0.50,
        },
    ]

    for scenario in scenarios:

        print("\n" + "=" * 60)
        print(scenario["name"])
        print("=" * 60)

        result = analyze_security(
            network_features=network_features,
            n_bits=100,
            noise_rate=scenario["noise_rate"],
            eve_probability=scenario["eve_probability"],
        )

        print(result)


if __name__ == "__main__":
    main()