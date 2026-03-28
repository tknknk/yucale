package io.github.tknknk.yucale.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import io.github.tknknk.yucale.service.IcsService;

@Component
@RequiredArgsConstructor
@Slf4j
public class IcsFileInitializer implements ApplicationRunner {

    private final IcsService icsService;

    @Override
    public void run(ApplicationArguments args) {
        log.info("Generating ICS file on application startup...");
        icsService.generateAndSaveIcsFile();
    }
}
