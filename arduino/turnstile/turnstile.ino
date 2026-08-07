#include <Servo.h>

const byte SERVO_PIN = 9;
const int CLOSED_ANGLE = 0;
const int OPEN_ANGLE = 90;
const unsigned long AUTO_CLOSE_MS = 5000;
const char FIRMWARE_VERSION[] = "TURNSTILE_V2";

Servo barrierServo;
bool barrierOpen = false;
unsigned long openedAt = 0;

void closeBarrier(const char* reason) {
  barrierServo.write(CLOSED_ANGLE);
  barrierOpen = false;
  Serial.print("CLOSED:");
  Serial.println(reason);
}

void openBarrier() {
  barrierServo.write(OPEN_ANGLE);
  barrierOpen = true;
  openedAt = millis();
  Serial.print("OPENED:");
  Serial.println(AUTO_CLOSE_MS);
}

void setup() {
  Serial.begin(9600);
  barrierServo.attach(SERVO_PIN);
  barrierServo.write(CLOSED_ANGLE);
  Serial.print("READY:");
  Serial.print(FIRMWARE_VERSION);
  Serial.print(":");
  Serial.println(AUTO_CLOSE_MS);
}

void loop() {
  if (barrierOpen && millis() - openedAt >= AUTO_CLOSE_MS) {
    closeBarrier("AUTO");
  }

  if (!Serial.available()) return;

  String command = Serial.readStringUntil('\n');
  command.trim();
  command.toUpperCase();

  if (command == "OPEN") {
    openBarrier();
  } else if (command == "CLOSE") {
    closeBarrier("COMMAND");
  } else if (command == "STATUS") {
    Serial.println(barrierOpen ? "STATUS:OPEN" : "STATUS:CLOSED");
  } else {
    Serial.print("ERROR:");
    Serial.println(command);
  }
}
