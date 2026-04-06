#include "ld6001_ms72sf1_connector.h"
#include <algorithm>
#include <cmath>

namespace hilink {

    Ld6001Parser::Ld6001Parser() {
    }

    int16_t fromLittleEndianSigned(const uint8_t *data) {
        const auto val = static_cast<int16_t>(data[0] | static_cast<uint16_t>(data[1]) << 8);
        const int16_t mask = -((data[1] ^ 0x80) >> 7 & 1);
        return static_cast<int16_t>((~val + 1 & mask) | (val - 0x8000 & ~mask));
    }

    uint16_t fromLittleEndian(const uint8_t *data) {
        return (data[1] << 8) | data[0];
    }

    Ld6001Parser::SensorData bytes2SensorData(const baudvine::RingBuf<uint8_t, MAX_BUF_SIZE>::iterator &it,
                                              int targetIndex) {
        Ld6001Parser::SensorData sensorData;
        sensorData.targetId = static_cast<Ld6001Parser::SensorTarget>(targetIndex);
        auto offset = sizeof(RX_DATA_PREAMBLE) + targetIndex * 8;
        sensorData.x = fromLittleEndianSigned(&it[offset + 0]);
        sensorData.y = fromLittleEndianSigned(&it[offset + 2]);
        sensorData.speed = fromLittleEndianSigned(&it[offset + 4]);
        sensorData.distanceInCm = sqrt(sensorData.x / 10 * sensorData.x / 10 + sensorData.y / 10 * sensorData.y / 10);
        // Euclidean distance squared
        sensorData.resolution = fromLittleEndian(&it[offset + 6]);

        // A target is considered invalid if all fields are zero.
        sensorData.valid = !(sensorData.x == 0 && sensorData.y == 0 && sensorData.speed == 0);

        return sensorData;
    }

    std::vector<Ld6001Parser::SensorData> Ld6001Parser::parse(const uint8_t *data, size_t len) {
        for (size_t i = 0; i < len; i++) {
            m_buffer.push_back(data[i]);
        }

        std::vector<SensorData> detected_targets;

        while (m_buffer.size() >= FRAME_SIZE) {
            auto it = m_buffer.begin();
            if (it[0] == RX_DATA_PREAMBLE[0]
                && it[1] == RX_DATA_PREAMBLE[1]
                && it[2] == RX_DATA_PREAMBLE[2]
                && it[3] == RX_DATA_PREAMBLE[3]
                && it[sizeof(RX_DATA_PREAMBLE) + FRAME_PAYLOAD_SIZE + 0] == RX_DATA_POSTAMBLE[0]
                && it[sizeof(RX_DATA_PREAMBLE) + FRAME_PAYLOAD_SIZE + 1] == RX_DATA_POSTAMBLE[1]
            ) {
                for (int i = 0; i < MAX_TARGETS; ++i) {
                    if (SensorData sd = bytes2SensorData(it, i); sd.valid) {
                        detected_targets.push_back(sd);
                    }
                }
                removeFrameFromBuffer();
            } else {
                m_buffer.pop_front();
            }
        }

        return detected_targets;
    }

    void Ld6001Parser::removeFrameFromBuffer() {
        for (int i = 0; i < FRAME_SIZE; ++i) {
            m_buffer.pop_front();
        }
    }
} // namespace hilink
