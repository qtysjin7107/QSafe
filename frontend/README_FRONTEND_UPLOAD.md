# Q-Safe Frontend — Dataset Upload Addition

This package preserves the existing Q-Safe frontend and its current themes/animations.

Added:
- CSV/TXT/TSV dataset upload box
- click + drag/drop upload
- file validation
- Analyze Dataset action
- existing dashboard metric boxes populated from the backend upload response
- dataset result boxes for rows, normal/attack counts, average threat, Accuracy, Precision, Recall and F1
- existing research charts updated from the uploaded analysis result

Existing features were retained:
- all current themes
- ambient particle system
- mouse interaction
- quantum channel flow animation
- Dragon Guardian animation
- demo scenario controls
- existing charts
- existing security analysis

The upload endpoint expected by this frontend is:

POST /api/upload/analyze

Multipart field:
file

Optional fields sent by the frontend:
n_bits
trials
noise_rate
eve_probability

The backend is responsible for the actual model inference and Q-Safe security decision.
