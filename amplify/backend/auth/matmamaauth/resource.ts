import { AmplifyAuthResourceStackTemplate } from "@aws-amplify/cli-extensibility-helper";

export function override(resources: AmplifyAuthResourceStackTemplate): void {
  resources.userPool.autoVerifiedAttributes = ["email"];
  resources.userPoolClient.refreshTokenValidity = 30;
  resources.userPoolClient.tokenValidityUnits = { RefreshToken: "days" };
}
