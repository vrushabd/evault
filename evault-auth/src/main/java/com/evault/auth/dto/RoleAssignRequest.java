package com.evault.auth.dto;

import com.evault.auth.model.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class RoleAssignRequest {

    @NotBlank
    @Pattern(regexp = "^0x[a-fA-F0-9]{40}$")
    private String walletAddress;

    @NotNull
    private Role role;

    public RoleAssignRequest() {
    }

    public String getWalletAddress() {
        return walletAddress;
    }

    public void setWalletAddress(String walletAddress) {
        this.walletAddress = walletAddress;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}
