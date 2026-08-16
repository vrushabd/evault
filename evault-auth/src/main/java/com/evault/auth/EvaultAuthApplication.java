package com.evault.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EvaultAuthApplication {

    public static void main(String[] args) {
        SpringApplication.run(EvaultAuthApplication.class, args);
    }

}
